import { sendAlert, sendData } from '@/pages/api/socket'
import Binance, { CandleChartResult, Candle, ReconnectingWebSocketHandler } from 'binance-api-node'
import {
  ADX,
  ATR,
  AwesomeOscillator,
  BollingerBands,
  EMA,
  MACD,
  RSI,
  SMA
} from 'technicalindicators'
import { ADXOutput } from 'technicalindicators/declarations/directionalmovement/ADX'
import { MACDOutput } from 'technicalindicators/declarations/moving_averages/MACD'
import { BollingerBandsOutput } from 'technicalindicators/declarations/volatility/BollingerBands'
import { prisma } from './db'

type MyCandleChartInterval = '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'

export interface CandleData {
  time: number | undefined
  open: number
  high: number
  low: number
  close: number
  volume: number
  isFinal: boolean
  volAverage: number
  ema20?: number
  sma50?: number
  sma200?: number
  rsi: number
  bollinger: BollingerBandsOutput //{ middle: number; upper: number; lower: number }
  atr: number
  ao: number
  adx: ADXOutput
  // {
  //   "adx": number,
  //   "mdi": number,  //-di
  //   "pdi": number // +di
  // }
  macd: MACDOutput
  crossUp: boolean
  crossDown: boolean
  candlePercentAbove: number
  candlePercentBelow: number
  isRedCandle: boolean
  isGreenCandle: boolean
  hasPrevCandleHighVolAndRevert: boolean //previous candle have high volume, next candle reverse.. showing loosing power
  hasLastCandleHighVolumeAndRevert: boolean //next candle entering with high volume and reversing
  hasPrevCandleHighVol: boolean
  hasLastCandleHighVolume: boolean
  isBiggerThanPrevious: boolean
  prev10CandleVolumeCount: number
  isAlert?: boolean
  alertType?: string
}

interface Symbol {
  symbol: string
  status: string
  baseAsset: string
  minNotional: any //(minNotional as SymbolMinNotionalFilter).minNotional
  price: number
  data5m: CandleData[]
  data15m: CandleData[] // open,high,low,close,volume data de rsiLength velas
  data30m: CandleData[]
  data1h: CandleData[]
  data4h: CandleData[]
  data1d: CandleData[]
  data1w: CandleData[]
}

const USE_FUTURES_DATA = true
const client = Binance()
let symbols: Symbol[] = []
let sockets: ReconnectingWebSocketHandler[] = []
let exchangeInfo: any = null
const TOTAL_BTC_CANDLES = 201
const TOTAL_CLIENT_CANDLES = 30 // lo que se manda al cliente, debe ser menor que TOTAL_CANDLES
let RSI_LENGTH = 14
let ATR_PERIOD = 14
let ADX_PERIOD = 14
let AWESOME_OSC_FAST_PERIOD = 5
let AWESOME_OSC_SLOW_PERIOD = 34
let MACD_FAST_PERIOD = 12
let MACD_SLOW_PERIOD = 26
let MACD_SIGNAL_PERIOD = 9
let MIN_RSI = 30
let MAX_RSI = 70
let BB_CANDLE_PERCENT_OUT = 40
let VOLUME_LENGTH = 30 //  por ahora usar rsi length
let VOL_FACTOR = 2.5 //cuanto mas deberia ser el nuevo candle, para considerar q es "power candle"
// segun el ejemplo del technical indicator.. la data para calcular (el sma, rsi) es casi el doble
const TOTAL_CANDLES = Math.max(
  VOLUME_LENGTH * 2,
  RSI_LENGTH * 2,
  AWESOME_OSC_FAST_PERIOD * 2,
  AWESOME_OSC_SLOW_PERIOD * 2,
  MACD_FAST_PERIOD * 2,
  MACD_SLOW_PERIOD * 2,
  MACD_SIGNAL_PERIOD * 2,
  TOTAL_CLIENT_CANDLES + 1
)
const includeLastCandleData = true // add incomplete last candle to the data
let timerHandler: any = null
let timerTTLHandler: any = null

// // Authenticated client, can make signed calls
// const client2 = Binance({
//   apiKey: 'xxx',
//   apiSecret: 'xxx',
//   getTime: xxx,
// })

const getSymbols = async () => {
  console.log('Getting symbols')
  if (USE_FUTURES_DATA) {
    exchangeInfo = await client.futuresExchangeInfo()
  } else {
    exchangeInfo = await client.exchangeInfo()
  }

  const bannedSymbols = [
    '1000LUNCUSDT',
    'XVSUSDT',
    'ASTRUSDT',
    'ARUSDT',
    'API3USDT',
    'BANDUSDT',
    'BLURUSDT',
    'BLUEBIRDUSDT',
    'BTCDOMUSDT',
    'BTCUSDT_230929',
    'BNXUSDT',
    'CELOUSDT',
    'COMBOUSDT',
    'CTKUSDT',
    'DEFIUSDT',
    'DGBUSDT',
    'ETHUSDT_230929',
    'ENSUSDT',
    'FOOTBALLUSDT',
    'JOEUSDT',
    'KNCUSDT',
    'LEVERUSDT',
    'MTLUSDT',
    'MINAUSDT',
    'OMGUSDT',
    'TRUUSDT',
    'TUSDT',
    'TLMUSDT',
    'USDCUSDT',
    'UMAUSDT',
    'XVGUSDT',
    'ZENUSDT'
  ]
  symbols = exchangeInfo.symbols
    .filter((coin: any) => coin.quoteAsset === 'USDT' && coin.status === 'TRADING')
    .filter((coin: any) => !bannedSymbols.includes(coin.symbol))
    // .filter((coin: any) => coin.symbol === 'LTCUSDT')
    .map((coin: any) => {
      const minNotional = coin.filters.filter(
        (f: any) => (f.filterType as string) === 'NOTIONAL'
      )[0]
      return {
        symbol: coin.symbol,
        status: coin.status,
        baseAsset: coin.baseAsset,
        minNotional: minNotional, //(minNotional as SymbolMinNotionalFilter).minNotional
        price: 0,
        //quiero saber el promedio d volumen de las penultimas velas en x temporalidad
        // pa saber si es un push Vela supera con juerza
        // data1: [],
        data5m: [],
        data15m: [], // open,high,low,close,volume data de rsiLength velas
        data30m: [],
        data1h: [],
        data4h: [],
        data1d: [],
        data1w: []
      }
    })
  // .slice(0, 10) //TODO: remove slice

  console.log('found symbols', symbols.length)
  return symbols
}

const populatePrice = async () => {
  console.log('populatePrice')
  // populate current price, esto podria ponerse en un timer aparte cada 1 segundo
  // a menos q el current price sea igual al close price
  // nah... el precio debe ser el mas actualizao a 1 segundo, NO a x interval (>5min es mucho tiempo)
  let prices: any = {}
  if (USE_FUTURES_DATA) {
    prices = await client.futuresPrices()
  } else {
    prices = await client.prices()
  }
  symbols.forEach(coin => {
    try {
      coin.price = prices[coin.symbol]
    } catch (error) {
      console.log('no price for ', coin.symbol, error)
    }
  })
}

const getCandles = async (coin: any, interval: MyCandleChartInterval = '15m') => {
  // console.log('getting initial candles', interval)
  // for (let coin of symbols) {
  // console.log('getting candles', coin)
  // await sleep(exchangeInfo.rateLimits[0].limit) // milliseconds
  // need to get extra (limit) value, so rsi calculates
  // console.log('getting candle data', coin)
  if (coin[`data${interval}`].length > 0) {
    // already fetched data, skip
    return
  }

  console.log('getting initial candles for:', interval, coin.symbol)
  let data

  // get more data for BTC to calculate sma/ema
  let totalCandles = TOTAL_CANDLES

  if (coin.symbol === 'BTCUSDT') {
    totalCandles = Math.max(TOTAL_CANDLES, TOTAL_BTC_CANDLES)
  }

  if (USE_FUTURES_DATA) {
    data = await client.futuresCandles({ symbol: coin.symbol, interval, limit: totalCandles })
  } else {
    data = await client.candles({ symbol: coin.symbol, interval, limit: totalCandles })
  }

  // no data for that interval, probably coin is new
  if (data.length <= 1) {
    console.log('new coin, not enough data', coin.symbol, interval, data)
  } else {
    // remove last candle, this is incomplete and gonna populate with sockets in real time
    data = data.slice(0, data.length - 1)
  }

  coin[`data${interval}`] = data.map((d: any) => getCandleData(d))

  // //TODO:DEbugcode.. delete after
  // if (coin.symbol === 'LTCUSDT' && interval === '5m') {
  //   console.log('data 1w for LTCUSDT', data)
  // }

  addExtraCandleData(coin, interval)

  // }
  // console.log('candles', symbols[0].data1m)
}

//--------------------------------
type CandleType = Candle & CandleChartResult
const getCandleData = (candle: Partial<CandleType>): CandleData => {
  return {
    time: candle.openTime || candle.eventTime,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
    isFinal: candle.isFinal ?? true,
    volAverage: 0,
    rsi: 0,
    isRedCandle: false,
    isGreenCandle: false,
    hasPrevCandleHighVolAndRevert: false,
    hasLastCandleHighVolumeAndRevert: false,
    hasPrevCandleHighVol: false,
    hasLastCandleHighVolume: false,
    isBiggerThanPrevious: false,
    prev10CandleVolumeCount: 0,
    bollinger: { middle: 0, upper: 0, lower: 0, pb: 0 },
    atr: 0,
    ao: 0,
    adx: {
      adx: 0,
      mdi: 0, //-di
      pdi: 0 // +di
    },
    macd: { MACD: 0, histogram: 0, signal: 0 },
    crossUp: false,
    crossDown: false,
    candlePercentAbove: 0,
    candlePercentBelow: 0,
    isAlert: false,
    alertType: ''
  }
}

//---------------------------------------
const calculateRSI = (values: number[] = []) => {
  return RSI.calculate({ values, period: RSI_LENGTH })
}

const getLastRSIValue = (values: number[] = []) => {
  const rsi = calculateRSI(values)
  return rsi.length > 0 ? rsi[rsi.length - 1] : 0
}

const addExtraCandleData = (coin: Symbol, interval: MyCandleChartInterval = '15m') => {
  const data = coin[`data${interval}`]
  // calc rsi
  const close = data.map((val: any) => Number(val.close))
  const high = data.map((val: any) => Number(val.high))
  const low = data.map((val: any) => Number(val.low))

  // isRedCandle
  const lastCandle = data[data.length - 1]
  const isLastCandleRed = lastCandle ? lastCandle.close < lastCandle.open : false
  const isLastCandleGreen = lastCandle ? lastCandle.close > lastCandle.open : false

  const prevCandle = data[data.length - 2]
  const isPrevCandleRed = prevCandle ? prevCandle.close < prevCandle.open : false
  const isPrevCandleGreen = prevCandle ? prevCandle.close > prevCandle.open : false

  //----------------------------
  // hasPrevCandleHighVolAndRevert
  const volume = data.map((val: any) => Number(val.volume))
  const volSMA = SMA.calculate({ period: VOLUME_LENGTH, values: volume })
  const volAverage = volSMA[volSMA.length - 1] ?? 0
  const prevVolume = volume[volume.length - 2] ?? 0
  const lastVolume = volume[volume.length - 1] ?? 0

  const ema20 = EMA.calculate({ period: 20, values: close })
  const sma50 = SMA.calculate({ period: 50, values: close })
  const sma200 = SMA.calculate({ period: 200, values: close })
  const ema20last = ema20[ema20.length - 1] ?? 0
  const sma50last = sma50[sma50.length - 1] ?? 0
  const sma200last = sma200[sma200.length - 1] ?? 0

  // bollinger band
  const bbPeriod = 20
  const bolinger = BollingerBands.calculate({ period: bbPeriod, values: close, stdDev: 2 })
  const bblast = bolinger[bolinger.length - 1] ?? { middle: 0, upper: 0, lower: 0 }

  let crossUp = false
  if (lastCandle.high > bblast.lower && lastCandle.low < bblast.lower && isLastCandleGreen) {
    crossUp = true
  }

  let crossDown = false
  if (lastCandle.high > bblast.upper && lastCandle.low < bblast.upper && isLastCandleRed) {
    crossDown = true
  }

  const candleSize = lastCandle.high - lastCandle.low //100%
  let candlePercentAbove = 0
  if (lastCandle.high > bblast.upper && lastCandle.low < bblast.upper) {
    const candleSliceAbove = lastCandle.high - bblast.upper
    candlePercentAbove = (candleSliceAbove * 100) / candleSize
  }
  let candlePercentBelow = 0
  if (lastCandle.low < bblast.lower && lastCandle.high > bblast.lower) {
    const candleSliceBelow = bblast.lower - lastCandle.low
    candlePercentBelow = (candleSliceBelow * 100) / candleSize
  }

  const prevCandleHighVolume = prevVolume > volAverage * VOL_FACTOR
  const lastCandleHighVolume = lastVolume > volAverage * VOL_FACTOR

  //----------------------------
  // isBiggerThanPrevious
  const lastCandleBodySize = lastCandle ? Math.abs(lastCandle.open - lastCandle.close) : 0
  const prevCandleBodySize = prevCandle ? Math.abs(prevCandle.open - prevCandle.close) : 0
  const lastCandleIsBigger = lastCandleBodySize > prevCandleBodySize

  // prev 10 candle high volume count
  let prev10CandleVolumeCount = 0
  if (volume.length > 10 && volAverage > 0) {
    prev10CandleVolumeCount =
      volume.slice(-10).filter((vol: number) => vol > volAverage * VOL_FACTOR).length ?? 0
  }

  // ATR (volatilidad)
  const atrInput = { high, low, close, period: ATR_PERIOD }
  const atr = ATR.calculate(atrInput)
  const atrLast = atr[atr.length - 1] ?? 0

  // ADX (direccionalidad sube o baja)
  // Valor del ADX	Fortaleza de latendencia
  // 0-25	Ausencia de tendencia
  // 25-50	Tendencia fuerte
  // 50-75	Tendencia muy fuerte
  // 75-100	Tendencia extremadamente fuerte
  const adxInput = { high, low, close, period: ADX_PERIOD }
  const adx = ADX.calculate(adxInput)
  const adxLast = adx[adx.length - 1] ?? {
    adx: 0,
    mdi: 0, //-di
    pdi: 0 // +di
  }

  // Awesome oscilator
  // mayor 0 compras
  //menor a 0 ventas
  // AO = SMA5 - SMA34

  const aoInput = {
    high,
    low,
    fastPeriod: AWESOME_OSC_FAST_PERIOD,
    slowPeriod: AWESOME_OSC_SLOW_PERIOD,
    format: (a: any) => parseFloat(a.toFixed(2))
  }
  const ao = AwesomeOscillator.calculate(aoInput)
  const aoLast = ao[ao.length - 1] ?? 0

  // MACD 12,26,9
  const MACDInput = {
    values: close,
    fastPeriod: MACD_FAST_PERIOD,
    slowPeriod: MACD_SLOW_PERIOD,
    signalPeriod: MACD_SIGNAL_PERIOD,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  }
  const macd = MACD.calculate(MACDInput)
  const macdLast = macd[macd.length - 1] ?? { MACD: 0, histogram: 0, signal: 0 }

  // save extra data on last candle
  data[data.length - 1] = {
    ...data[data.length - 1],
    volAverage,
    ema20: ema20last,
    sma50: sma50last,
    sma200: sma200last,
    rsi: getLastRSIValue(close),
    isRedCandle: isLastCandleRed,
    isGreenCandle: isLastCandleGreen,
    // prev candle high volume, change candle color--- showing loosing power or attemp to reverse
    hasPrevCandleHighVolAndRevert: prevCandleHighVolume && isPrevCandleGreen === isLastCandleRed,
    // last candle high volume, change candle color--- showing interest, things gonna move!
    hasLastCandleHighVolumeAndRevert: lastCandleHighVolume && isPrevCandleGreen === isLastCandleRed,
    hasPrevCandleHighVol: prevCandleHighVolume,
    hasLastCandleHighVolume: lastCandleHighVolume,
    isBiggerThanPrevious: lastCandleIsBigger,
    prev10CandleVolumeCount: prev10CandleVolumeCount,
    bollinger: bblast,
    atr: atrLast,
    ao: aoLast, // awesome oscilator
    adx: adxLast, // direccionalidad
    macd: macdLast,
    crossUp,
    crossDown,
    candlePercentAbove,
    candlePercentBelow
  }
}

const addCandleData = (sendAlert: (type: string, data: any) => void) => async (candle: Candle) => {
  /* candles keys
        [
        'eventType',   'eventTime',
        'symbol',      'startTime',
        'closeTime',   'firstTradeId',
        'lastTradeId', 'open',
        'high',        'low',
        'close',       'volume',
        'trades',      'interval',
        'isFinal',     'quoteVolume',
        'buyVolume',   'quoteBuyVolume'
      ]
      */

  const interval = candle.interval as MyCandleChartInterval
  const symbol = candle.symbol
  const coin = symbols.find(s => s.symbol === symbol)
  if (!coin) return // symbol doesnt exist

  // console.log('adding candle data', interval, symbol)
  const candleData = getCandleData(candle)
  const count = coin[`data${interval}`].length
  const lastCandle = coin[`data${interval}`][count - 1]
  const prevCandle = coin[`data${interval}`][count - 2]

  if (candle.isFinal) {
    // append data at the end

    if (!lastCandle.isFinal) {
      coin[`data${interval}`][count - 1] = candleData
    } else {
      coin[`data${interval}`] = [...coin[`data${interval}`], candleData]
    }
    // console.log('inc ',`data${interval}`, coin.symbol)
  } else {
    // incomplete candle data
    if (includeLastCandleData) {
      // el candle aun se esta formando en x temporalidad, ejm vela de 30 min.. recien va por minuto 16
      // replace last element on the array
      // esto va a afectar el calculo del RSI, al tener un candle incompleto
      // check if last candle on stored data is incomplete, and replace it
      if (!lastCandle.isFinal) {
        coin[`data${interval}`][count - 1] = candleData
      } else {
        coin[`data${interval}`] = [...coin[`data${interval}`], candleData]
      }
    }
  }

  // set coin price
  coin.price = Number(candle.close)

  // add extra data like, ema,sma,hasLastCandleHighVolumeAndRevert,isbigger,isstop etc
  addExtraCandleData(coin, interval)

  // --------------------------
  // ALERTS !!
  // --------------------------
  if (candle.isFinal) {
    if (
      lastCandle.hasLastCandleHighVolume &&
      lastCandle.isBiggerThanPrevious &&
      (isOverBought(lastCandle) ||
        isOverSold(lastCandle) ||
        isOverBought(prevCandle) ||
        isOverSold(prevCandle))
    ) {
      sendAlert(`alert:powercandle:${interval}`, coin)
      // lastCandle.isAlert = true
      // lastCandle.alertType =`alert:powercandle:${interval}`
    }

    // if (lastCandle.prev10CandleVolumeCount > 3) {
    //   sendAlert(`alert:volumecount:${interval}`, coin)
    // }

    // strongs candles (VELOTAS)
    // lastCandleHighVolume && candle change color
    // maybe only on rsi?
    // or outside bolinger band
    // if (lastCandle.hasLastCandleHighVolumeAndRevert) {
    //   sendAlert(`alert:strongcandle:${interval}`, coin)
    // }

    if (isOverSold(lastCandle) || isOverSold(prevCandle)) {
      //sobreventa rsi <30
      if (lastCandle.crossUp && lastCandle.candlePercentBelow > BB_CANDLE_PERCENT_OUT) {
        sendAlert(`alert:bollingerUp:${interval}`, coin)
        lastCandle.isAlert = true
        lastCandle.alertType = `alert:bollingerUp:${interval}`
      }
    }

    if (isOverBought(lastCandle) || isOverBought(prevCandle)) {
      //sobrecompra rsi > 70
      if (lastCandle.crossDown && lastCandle.candlePercentAbove > BB_CANDLE_PERCENT_OUT) {
        sendAlert(`alert:bollingerDown:${interval}`, coin)
        lastCandle.isAlert = true
        lastCandle.alertType = `alert:bollingerDown:${interval}`
      }
    }

    // candle verde ..con mayor volumen rojo
    const sellVolume = getSellVolume(lastCandle)
    const buyVolume = getBuyVolume(lastCandle)

    if (
      lastCandle.hasLastCandleHighVolumeAndRevert &&
      lastCandle.isGreenCandle &&
      sellVolume + 10 > buyVolume && // candle verde.. pintado de rojo xq tiene mas volumen de ventas
      isOverBought(lastCandle) &&
      lastCandle.candlePercentAbove > BB_CANDLE_PERCENT_OUT
    ) {
      sendAlert(`alert:bigCandleDown:${interval}`, coin)
      lastCandle.isAlert = true
      lastCandle.alertType = `alert:bigCandleDown:${interval}`
    }

    if (
      lastCandle.hasLastCandleHighVolumeAndRevert &&
      lastCandle.isRedCandle &&
      buyVolume + 10 > sellVolume &&
      isOverSold(lastCandle) &&
      lastCandle.candlePercentBelow > BB_CANDLE_PERCENT_OUT
    ) {
      sendAlert(`alert:bigCandleUp:${interval}`, coin)
      lastCandle.isAlert = true
      lastCandle.alertType = `alert:bigCandleUp:${interval}`
    }

    //----------------------------------
    // CHECK if alerttype was correct
    //----------------------------------
    if (prevCandle.isAlert) {
      if (prevCandle.alertType === `alert:bollingerDown:${interval}`) {
        let win = lastCandle.isRedCandle
        //TODO: save on db
        const alert = await prisma.alerts.create({
          data: {
            symbol: coin.symbol,
            alertType: prevCandle.alertType,
            time: prevCandle.time ?? 0,
            open: prevCandle.open,
            high: prevCandle.high,
            low: prevCandle.low,
            close: prevCandle.close,
            volume: prevCandle.volume,
            isFinal: prevCandle.isFinal,
            isRedCandle: prevCandle.isRedCandle,
            isGreenCandle: prevCandle.isGreenCandle,
            isRedCandleNext: lastCandle.isRedCandle,
            isGreenCandleNext: lastCandle.isGreenCandle,
            win
          }
        })
      }
      if (prevCandle.alertType === `alert:bollingerUp:${interval}`) {
        let win = lastCandle.isGreenCandle
        //TODO: save on db
        const alert = await prisma.alerts.create({
          data: {
            symbol: coin.symbol,
            alertType: prevCandle.alertType,
            time: prevCandle.time ?? 0,
            open: prevCandle.open,
            high: prevCandle.high,
            low: prevCandle.low,
            close: prevCandle.close,
            volume: prevCandle.volume,
            isFinal: prevCandle.isFinal,
            isRedCandle: prevCandle.isRedCandle,
            isGreenCandle: prevCandle.isGreenCandle,
            isRedCandleNext: lastCandle.isRedCandle,
            isGreenCandleNext: lastCandle.isGreenCandle,
            win
          }
        })
      }

      if (prevCandle.alertType === `alert:bigCandleDown:${interval}`) {
        let win = lastCandle.isRedCandle
        //TODO: save on db
        const alert = await prisma.alerts.create({
          data: {
            symbol: coin.symbol,
            alertType: prevCandle.alertType,
            time: prevCandle.time ?? 0,
            open: prevCandle.open,
            high: prevCandle.high,
            low: prevCandle.low,
            close: prevCandle.close,
            volume: prevCandle.volume,
            isFinal: prevCandle.isFinal,
            isRedCandle: prevCandle.isRedCandle,
            isGreenCandle: prevCandle.isGreenCandle,
            isRedCandleNext: lastCandle.isRedCandle,
            isGreenCandleNext: lastCandle.isGreenCandle,
            win
          }
        })
      }

      if (prevCandle.alertType === `alert:bigCandleUp:${interval}`) {
        let win = lastCandle.isGreenCandle
        //TODO: save on db
        const alert = await prisma.alerts.create({
          data: {
            symbol: coin.symbol,
            alertType: prevCandle.alertType,
            time: prevCandle.time ?? 0,
            open: prevCandle.open,
            high: prevCandle.high,
            low: prevCandle.low,
            close: prevCandle.close,
            volume: prevCandle.volume,
            isFinal: prevCandle.isFinal,
            isRedCandle: prevCandle.isRedCandle,
            isGreenCandle: prevCandle.isGreenCandle,
            isRedCandleNext: lastCandle.isRedCandle,
            isGreenCandleNext: lastCandle.isGreenCandle,
            win
          }
        })
      }
    }
  }

  // max data to keep deberia ser   RSI_LENGTH +1
  // para tener data suficiente para el rsi, sma, ema

  // get more data for BTC to calculate sma/ema
  let totalCandles = Math.max(TOTAL_CLIENT_CANDLES + 2, TOTAL_CANDLES)

  if (coin.symbol === 'BTCUSDT') {
    totalCandles = Math.max(TOTAL_CLIENT_CANDLES + 2, TOTAL_BTC_CANDLES)
  }
  // // we keep only enought data for rsi calc
  // we should have enough for rsi, or max TOTAL_CANDLES
  coin[`data${interval}`] = coin[`data${interval}`].slice(-totalCandles)

  // send data to client
  // sendData() // sending too many data, should use some interval thing to avoid sending per coin
}
//---------------------------------------
// TODO:
/*
actualizar precio cada x segundo
mostrar un chart de BTC
mostrar un chart de current selected coin
// stop candle: previous candle have high volume, next candle reverse.. showing loosing power
// power candle: next candle entering with high volume and reversing (changin color)
// strong power candle: next candle is bigger than previous

---------
client:
filtro por moneda
*/

//---------------------------------------
export const initializeCandles = async () => {
  //-=========================
  // preparar la data para mostrar
  // obtener symbols/lista de coins
  await getSymbols()
  sendData(getDataToSend())
  // llenar price
  await populatePrice()
  sendData(getDataToSend())

  // data inicial
  for (let coin of symbols) {
    await getCandles(coin, '5m')
    await getCandles(coin, '15m')
    await getCandles(coin, '30m')
    await getCandles(coin, '1h')
    await getCandles(coin, '4h')
    await getCandles(coin, '1d')
    // await getCandles(coin, '1w')
    sendData(getDataToSend())
    // console.log('symbol', symbols[0])
  }

  installSockets()

  // install timer to send data back to client periodically
  if (timerHandler) clearInterval(timerHandler)
  timerHandler = setInterval(() => sendData(getDataToSend()), 1000) // 1 second

  // install timer to check if socket is disconnected and reconnect
  if (timerTTLHandler) clearInterval(timerTTLHandler)
  timerTTLHandler = setInterval(() => checkConnectionOrReconnect(), 5 * 60 * 1000) // 5 minutes

  // console.log('send data', getDataToSend())
}

let lastBTCCandle: Partial<CandleData> = {
  time: 0,
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  volume: 0
}
let countDiffTTL = 0
const checkConnectionOrReconnect = () => {
  const coin = symbols.find(s => s.symbol === 'BTCUSDT')
  if (!coin) return // symbol doesnt exist

  const lastCandle = coin.data5m[coin.data5m.length - 1]
  // if at least one value is different, means that data is updating
  // sockets connection is alive
  if (
    lastCandle.time !== lastBTCCandle.time ||
    lastCandle.open !== lastBTCCandle.open ||
    lastCandle.high !== lastBTCCandle.high ||
    lastCandle.low !== lastBTCCandle.low ||
    lastCandle.close !== lastBTCCandle.close ||
    lastCandle.volume !== lastBTCCandle.volume
  ) {
    lastBTCCandle = lastCandle
  } else {
    console.log('hmmm... data didnt update', countDiffTTL)
    countDiffTTL += 1
  }

  if (countDiffTTL > 3) {
    // same data 3 times.. assume connection is broken
    console.log('....reconnecting sockets')
    // reset data n reconnect
    lastBTCCandle = {
      time: 0,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0
    }
    installSockets()
    countDiffTTL = 0
  }
}

export const installSockets = () => {
  console.log('install Sockets')

  if (sockets.length > 0) {
    // sockets installed, clearing
    unsubscribeAll()
  }

  const allCoins = symbols.map(coin => coin.symbol)
  // install socket t pull data periodically n save/recalc/emit

  if (USE_FUTURES_DATA) {
    sockets.push(
      client.ws.futuresCandles(allCoins, '5m', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '15m', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '30m', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '1h', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '4h', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '1d', addCandleData(sendAlert))
      // client.ws.futuresCandles(allCoins, '1w', addCandleData(sendAlert))
    )
  } else {
    sockets.push(
      client.ws.candles(allCoins, '5m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '15m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '30m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '1h', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '4h', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '1d', addCandleData(sendAlert))
      // client.ws.candles(allCoins, '1w', addCandleData(sendAlert))
    )
  }
  console.log('sockets installed', sockets.length)
}

export const setBBCandlePercentOut = (value: number) => {
  BB_CANDLE_PERCENT_OUT = value
}
export const setMinRSI = (value: number) => {
  MIN_RSI = value
}
export const setMaxRSI = (value: number) => {
  MAX_RSI = value
}
export const setRSILength = (value: number) => {
  RSI_LENGTH = value
}
export const setATRLength = (value: number) => {
  ATR_PERIOD = value
}
export const setVolumeLength = (value: number) => {
  VOLUME_LENGTH = value
}
export const setVolumeFactor = (value: number) => {
  VOL_FACTOR = value
}

export const pingTime = async () => {
  const time = await client.time()
  console.log('ping time', time)
  return time
}

const getDataToSend = () => {
  return symbols.map(coin => ({
    symbol: coin.symbol,
    minNotional: coin.minNotional,
    price: coin.price,
    data5m: coin.data5m.slice(-TOTAL_CLIENT_CANDLES),
    data15m: coin.data15m.slice(-TOTAL_CLIENT_CANDLES),
    data30m: coin.data30m.slice(-TOTAL_CLIENT_CANDLES),
    data1h: coin.data1h.slice(-TOTAL_CLIENT_CANDLES),
    data4h: coin.data4h.slice(-TOTAL_CLIENT_CANDLES),
    data1d: coin.data1d.slice(-TOTAL_CLIENT_CANDLES)
    // data1w: coin.data1w.slice(-TOTAL_CLIENT_CANDLES)
  }))
}

const isOverSold = (candle: any) => candle.rsi < MIN_RSI
const isOverBought = (candle: any) => candle.rsi > MAX_RSI
const getBodySize = (candle: any) => Math.abs(candle.open - candle.close)
const getSellVolume = (candle: any) =>
  candle.high === candle.low
    ? 0
    : (candle.volume * (candle.high - candle.close)) / (candle.high - candle.low)
const getBuyVolume = (candle: any) =>
  candle.high === candle.low
    ? 0
    : (candle.volume * (candle.close - candle.low)) / (candle.high - candle.low)

export const refreshData = () => {
  console.log('Refreshing data')
  sendData(getDataToSend())
}

export const unsubscribeAll = () => {
  sockets.forEach(unsubscribe => unsubscribe({ delay: 0, fastClose: true, keepClosed: true }))
  sockets = []
}
//--------------------
// helpers
// function chunk(array = [], count = 1) {
//   if (count == null || count < 1) return []
//   const result = []
//   let i = 0,
//     length = array.length
//   while (i < length) {
//     result.push(array.slice(i, (i += count)))
//   }
//   return result
// }
let sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
