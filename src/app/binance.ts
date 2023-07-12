import { sendAlert, sendData } from '@/pages/api/socket'
import Binance, {
  CandleChartInterval_LT,
  CandleChartResult,
  Candle,
  ReconnectingWebSocketHandler
} from 'binance-api-node'
import { EMA, RSI, SMA } from 'technicalindicators'
const USE_FUTURES_DATA = true
const client = Binance()
let symbols: any[] = []
let sockets: ReconnectingWebSocketHandler[] = []
let exchangeInfo: any = null
const TOTAL_BTC_CANDLES = 201
const TOTAL_CANDLES = 31
const TOTAL_CLIENT_CANDLES = 30 // lo que se manda al cliente, debe ser menor que TOTAL_CANDLES
let RSI_LENGTH = 14
let VOLUME_LENGTH = RSI_LENGTH // 20 // por ahora usar rsi length
let VOL_FACTOR = 2 //cuanto mas deberia ser el nuevo candle, para considerar q es "power candle"
const includeLastCandleData = true // add incomplete last candle to the data
let timerHandler: any = null

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
    'BLURUSDT',
    'XVGUSDT',
    'FOOTBALLUSDT',
    '1000LUNCUSDT',
    'USDCUSDT',
    'BTCDOMUSDT',
    'BTCUSDT_230929',
    'ETHUSDT_230929'
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
        data1w: [],
        rsi5m: 0,
        rsi15m: 0,
        rsi30m: 0,
        rsi1h: 0,
        rsi4h: 0,
        rsi1d: 0,
        rsi1w: 0,
        isRedCandle5m: false,
        isStopCandle5m: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle5m: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious5m: false,
        isRedCandle15m: false,
        isStopCandle15m: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle15m: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious15m: false,
        isRedCandle30m: false,
        isStopCandle30m: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle30m: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious30m: false,
        isRedCandle1h: false,
        isStopCandle1h: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle1h: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious1h: false,
        isRedCandle4h: false,
        isStopCandle4h: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle4h: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious4h: false,
        isRedCandle1d: false,
        isStopCandle1d: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle1d: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious1d: false,
        isRedCandle1w: false,
        isStopCandle1w: false, //previous candle have high volume, next candle reverse.. showing loosing power
        isPowerCandle1w: false, //next candle entering with high volume and reversing
        isBiggerThanPrevious1w: false,
        prev10CandleVolumeCount5m: 0,
        prev10CandleVolumeCount15m: 0,
        prev10CandleVolumeCount30m: 0,
        prev10CandleVolumeCount1h: 0,
        prev10CandleVolumeCount4h: 0,
        prev10CandleVolumeCount1d: 0,
        prev10CandleVolumeCount1w: 0
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

const getCandles = async (coin: any, interval: CandleChartInterval_LT = '15m') => {
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
  let totalCandles = Math.max(TOTAL_CLIENT_CANDLES + 2, TOTAL_CANDLES)

  if (coin.symbol === 'BTCUSDT') {
    totalCandles = Math.max(TOTAL_CLIENT_CANDLES + 2, TOTAL_BTC_CANDLES)
  }

  if (USE_FUTURES_DATA) {
    data = await client.futuresCandles({ symbol: coin.symbol, interval, limit: totalCandles })
  } else {
    data = await client.candles({ symbol: coin.symbol, interval, limit: totalCandles })
  }

  // remove last candle, this is incomplete and gonna populate with sockets in real time
  data = data.slice(0, data.length - 1)

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
const getCandleData = (candle: Partial<CandleType>) => {
  return {
    time: candle.openTime || candle.eventTime,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
    isFinal: candle.isFinal ?? true,
    volAverage: 0
  }
}

//---------------------------------------
const calculateRSI = (values = []) => {
  return RSI.calculate({ values, period: RSI_LENGTH })
}

const getLastRSIValue = (values = []) => {
  const rsi = calculateRSI(values)
  return rsi.length > 0 ? rsi[rsi.length - 1] : 0
}

const addExtraCandleData = (coin: any, interval: CandleChartInterval_LT = '15m') => {
  const data = coin[`data${interval}`]
  // calc rsi
  const close = data.map((val: any) => Number(val.close))
  coin[`rsi${interval}`] = getLastRSIValue(close)

  // isRedCandle
  const lastCandle = data[data.length - 1]
  const isLastCandleRed = lastCandle ? lastCandle.close < lastCandle.open : false
  const isLastCandleGreen = lastCandle ? lastCandle.close > lastCandle.open : false
  coin[`isRedCandle${interval}`] = isLastCandleRed

  const prevCandle = data[data.length - 2]
  const isPrevCandleRed = prevCandle ? prevCandle.close < prevCandle.open : false
  const isPrevCandleGreen = prevCandle ? prevCandle.close > prevCandle.open : false

  //----------------------------
  // isStopCandle
  const volume = data.map((val: any) => Number(val.volume))
  const volSMA = SMA.calculate({ period: VOLUME_LENGTH, values: volume })
  const volAverage = volSMA[volSMA.length - 1] ?? 0
  const prevVolume = volume[volume.length - 2] ?? 0

  const ema20 = EMA.calculate({ period: 20, values: close })
  const sma50 = SMA.calculate({ period: 50, values: close })
  const sma200 = SMA.calculate({ period: 200, values: close })
  const ema20last = ema20[ema20.length - 1] ?? 0
  const sma50last = sma50[sma50.length - 1] ?? 0
  const sma200last = sma200[sma200.length - 1] ?? 0

  // save vol avg on last candle
  data[data.length - 1] = {
    ...data[data.length - 1],
    volAverage,
    ema20: ema20last,
    sma50: sma50last,
    sma200: sma200last
  }

  // prev candle have high volume
  const prevCandleHighVolume = prevVolume > volAverage * VOL_FACTOR

  // prev candle high volume, change candle color--- showing loosing power or attemp to reverse
  coin[`isStopCandle${interval}`] = prevCandleHighVolume && isPrevCandleGreen && isLastCandleRed
  //----------------------------
  // isPowerCandle
  const lastVolume = volume[volume.length - 1] ?? 0
  const lastCandleHighVolume = lastVolume > volAverage * VOL_FACTOR

  // last candle high volume, change candle color--- showing interest, things gonna move!
  coin[`isPowerCandle${interval}`] = lastCandleHighVolume && isPrevCandleGreen && isLastCandleRed
  //----------------------------
  // isBiggerThanPrevious
  const lastCandleBodySize = lastCandle ? Math.abs(lastCandle.open - lastCandle.close) : 0
  const prevCandleBodySize = prevCandle ? Math.abs(prevCandle.open - prevCandle.close) : 0
  const lastCandleIsBigger = lastCandleBodySize > prevCandleBodySize
  coin[`isBiggerThanPrevious${interval}`] = lastCandleIsBigger

  // prev 10 candle high volume count
  let prev10CandleVolumeCount = 0
  if (volume.length > 10 && volAverage > 0) {
    prev10CandleVolumeCount =
      volume.slice(-10).filter((vol: number) => vol > volAverage * VOL_FACTOR).length ?? 0
  }
  coin[`prev10CandleVolumeCount${interval}`] = prev10CandleVolumeCount
}

const addCandleData = (sendAlert: (type: string, data: any) => void) => (candle: Candle) => {
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

  const interval = candle.interval as CandleChartInterval_LT
  const symbol = candle.symbol
  const coin = symbols.find(s => s.symbol === symbol)
  if (!coin) return // symbol doesnt exist

  // console.log('adding candle data', interval, symbol)
  const candleData = getCandleData(candle)
  const count = coin[`data${interval}`].length
  const lastCandle = coin[`data${interval}`][count - 1]

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
  coin.price = candle.close

  addExtraCandleData(coin, interval)

  // --------------------------
  // ALERTS !!
  // --------------------------
  if (candle.isFinal) {
    if (
      coin[`isPowerCandle${interval}`] &&
      coin[`isBiggerThanPrevious${interval}`] &&
      (coin[`rsi${interval}`] > 70 || coin[`rsi${interval}`] < 30)
    ) {
      sendAlert(`alert:powercandle:${interval}`, coin)
    }

    if (coin[`prev10CandleVolumeCount${interval}`] > 3) {
      sendAlert(`alert:volumecount:${interval}`, coin)
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
    await getCandles(coin, '1w')
    sendData(getDataToSend())
    // console.log('symbol', symbols[0])
  }

  installSockets()

  // install timer to send data back to client periodically
  if (timerHandler) clearInterval(timerHandler)
  timerHandler = setInterval(() => sendData(getDataToSend()), 1000) // 1 second

  // console.log('send data', getDataToSend())
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
      client.ws.futuresCandles(allCoins, '1d', addCandleData(sendAlert)),
      client.ws.futuresCandles(allCoins, '1w', addCandleData(sendAlert))
    )
  } else {
    sockets.push(
      client.ws.candles(allCoins, '5m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '15m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '30m', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '1h', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '4h', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '1d', addCandleData(sendAlert)),
      client.ws.candles(allCoins, '1w', addCandleData(sendAlert))
    )
  }
  console.log('sockets installed', sockets.length)
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
    data1d: coin.data1d.slice(-TOTAL_CLIENT_CANDLES),
    data1w: coin.data1w.slice(-TOTAL_CLIENT_CANDLES),
    rsi5m: coin.rsi5m,
    rsi15m: coin.rsi15m,
    rsi30m: coin.rsi30m,
    rsi1h: coin.rsi1h,
    rsi4h: coin.rsi4h,
    rsi1d: coin.rsi1d,
    rsi1w: coin.rsi1w,
    isRedCandle5m: coin.isRedCandle5m,
    isStopCandle5m: coin.isStopCandle5m,
    isPowerCandle5m: coin.isPowerCandle5m,
    isBiggerThanPrevious5m: coin.isBiggerThanPrevious5m,
    isRedCandle15m: coin.isRedCandle15m,
    isStopCandle15m: coin.isStopCandle15m,
    isPowerCandle15m: coin.isPowerCandle15m,
    isBiggerThanPrevious15m: coin.isBiggerThanPrevious15m,
    isRedCandle30m: coin.isRedCandle30m,
    isStopCandle30m: coin.isStopCandle30m,
    isPowerCandle30m: coin.isPowerCandle30m,
    isBiggerThanPrevious30m: coin.isBiggerThanPrevious30m,
    isRedCandle1h: coin.isRedCandle1h,
    isStopCandle1h: coin.isStopCandle1h,
    isPowerCandle1h: coin.isPowerCandle1h,
    isBiggerThanPrevious1h: coin.isBiggerThanPrevious1h,
    isRedCandle4h: coin.isRedCandle4h,
    isStopCandle4h: coin.isStopCandle4h,
    isPowerCandle4h: coin.isPowerCandle4h,
    isBiggerThanPrevious4h: coin.isBiggerThanPrevious4h,
    isRedCandle1d: coin.isRedCandle1d,
    isStopCandle1d: coin.isStopCandle1d,
    isPowerCandle1d: coin.isPowerCandle1d,
    isBiggerThanPrevious1d: coin.isBiggerThanPrevious1d,
    isRedCandle1w: coin.isRedCandle1w,
    isStopCandle1w: coin.isStopCandle1w,
    isPowerCandle1w: coin.isPowerCandle1w,
    isBiggerThanPrevious1w: coin.isBiggerThanPrevious1w,
    prev10CandleVolumeCount5m: coin.prev10CandleVolumeCount5m,
    prev10CandleVolumeCount15m: coin.prev10CandleVolumeCount15m,
    prev10CandleVolumeCount30m: coin.prev10CandleVolumeCount30m,
    prev10CandleVolumeCount1h: coin.prev10CandleVolumeCount1h,
    prev10CandleVolumeCount4h: coin.prev10CandleVolumeCount4h,
    prev10CandleVolumeCount1d: coin.prev10CandleVolumeCount1d,
    prev10CandleVolumeCount1w: coin.prev10CandleVolumeCount1w
  }))
}

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
