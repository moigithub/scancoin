import Binance, { CandleChartInterval_LT, CandleChartResult, Candle } from 'binance-api-node'
import { RSI, SMA } from 'technicalindicators'
const USE_FUTURES_DATA = true
const client = Binance()
let symbols: any[] = []
let sockets: any[] = []
let exchangeInfo: any = null
let RSI_LENGTH = 14
let VOL_LENGTH = 10
let VOL_FACTOR = 2 //cuanto mas deberia ser el nuevo candle, para considerar q es "power candle"
const includeLastCandleData = true // add incomplete last candle to the data

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

  symbols = exchangeInfo.symbols
    .filter((coin: any) => coin.quoteAsset === 'USDT' && coin.status === 'TRADING')
    .filter((coin: any) => coin.symbol === 'LTCUSDT')
    .map((coin: any) => {
      const minNotional = coin.filters.filter(
        (f: any) => (f.filterType as string) === 'NOTIONAL'
      )[0]
      return {
        symbol: coin.symbol,
        status: coin.status,
        baseAsset: coin.baseAsset,
        minNotional: minNotional, //(minNotional as SymbolMinNotionalFilter).minNotional
        // rsiLength: 14,
        // volumeLength:10, // usar el mismo rsi length
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
        isBiggerThanPrevious1w: false
      }
    })
  // .slice(0, 20) //TODO: remove slice

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

const getCandles = async (coin: any, interval: CandleChartInterval_LT = '15m', limit = 14) => {
  console.log('getting initial candles', interval)
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
  if (USE_FUTURES_DATA) {
    data = await client.futuresCandles({ symbol: coin.symbol, interval, limit: limit + 1 })
  } else {
    data = await client.candles({ symbol: coin.symbol, interval, limit: limit + 1 })
  }

  coin[`data${interval}`] = data.map((d: any) => getCandleData(d))

  // //TODO:DEbugcode.. delete after
  // if (coin.symbol === 'LTCUSDT' && interval === '5m') {
  //   console.log('data 1w for LTCUSDT', data)
  // }

  addExtraCandleData(coin, interval, limit)

  // }
  // console.log('candles', symbols[0].data1m)
}

//--------------------------------
const getCandleData = (candle: Candle) => {
  return {
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    isFinal: candle.isFinal ?? true
  }
}

//---------------------------------------
const getLastRSIValue = (values = [], period = 14) => {
  const rsi = RSI.calculate({ values, period })
  return rsi.length > 0 ? rsi[rsi.length - 1] : 0
}

const getCandlesProp = (data: any[], limit = 14) => {
  const prop = {
    isRedCandle: false,
    isStopCandle: false,
    isPowerCandle: false,
    isBiggerThanPrevious: false
  }
  // isRedCandle
  const lastCandle = data[data.length - 1]
  const isLastCandleRed = lastCandle ? lastCandle.close < lastCandle.open : false
  const isLastCandleGreen = lastCandle ? !isLastCandleRed : false
  prop.isRedCandle = isLastCandleRed

  const prevCandle = data[data.length - 2]
  const isPrevCandleRed = prevCandle ? prevCandle.close < prevCandle.open : false
  const isPrevCandleGreen = lastCandle ? !isPrevCandleRed : false

  //----------------------------
  // isStopCandle
  const volume = data.map((val: any) => Number(val.volume))
  const volSMA = SMA.calculate({ period: limit, values: volume })
  const volAverage = volSMA[volSMA.length - 1] ?? 0
  const prevVolume = volume[volume.length - 2] ?? 0
  // prev candle have high volume
  const prevCandleHighVolume = prevVolume > volAverage * VOL_FACTOR

  // prev candle high volume, change candle color--- showing loosing power or attemp to reverse
  const prevCandleHighVolumeChangeRedToGreen =
    prevCandleHighVolume && isPrevCandleRed && isLastCandleGreen
  const prevCandleHighVolumeChangeGreenToRed =
    prevCandleHighVolume && isPrevCandleGreen && isLastCandleRed

  prop.isStopCandle = prevCandleHighVolumeChangeRedToGreen || prevCandleHighVolumeChangeGreenToRed

  //----------------------------
  // isPowerCandle
  const lastVolume = volume[volume.length - 1] ?? 0
  const lastCandleHighVolume = lastVolume > volAverage * VOL_FACTOR

  // last candle high volume, change candle color--- showing interest, things gonna move!
  const lastCandleHighVolumeChangeRedToGreen =
    lastCandleHighVolume && isPrevCandleRed && isLastCandleGreen
  const lastCandleHighVolumeChangeGreenToRed =
    lastCandleHighVolume && isPrevCandleGreen && isLastCandleRed

  prop.isPowerCandle = lastCandleHighVolumeChangeRedToGreen || lastCandleHighVolumeChangeGreenToRed

  //----------------------------
  // isBiggerThanPrevious
  const lastCandleBodySize = Math.abs(lastCandle.open - lastCandle.close)
  const prevCandleBodySize = Math.abs(prevCandle.open - prevCandle.close)
  const lastCandleIsBigger = lastCandleBodySize > prevCandleBodySize
  prop.isBiggerThanPrevious = lastCandleIsBigger

  return prop
}

const addExtraCandleData = (coin: any, interval: CandleChartInterval_LT = '15m', limit = 14) => {
  // calc rsi
  const close = coin[`data${interval}`].map((val: any) => Number(val.close))
  coin[`rsi${interval}`] = getLastRSIValue(close, limit)

  const props = getCandlesProp(coin[`data${interval}`], limit)
  coin[`isRedCandle${interval}`] = props.isRedCandle
  coin[`isStopCandle${interval}`] = props.isStopCandle
  coin[`isPowerCandle${interval}`] = props.isPowerCandle
  coin[`isBiggerThanPrevious${interval}`] = props.isBiggerThanPrevious
}

const addCandleData =
  (limit = 14, callback: () => void) =>
  (candle: any) => {
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

    const interval = candle.interval
    const symbol = candle.symbol
    const coin = symbols.find(s => s.symbol === symbol)
    if (!coin) return // symbol doesnt exist

    console.log('adding candle data', interval, symbol)
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

    // max data to keep deberia ser   limit+1
    // para tener data suficiente para el rsi
    const max = limit + 1

    // we keep only enought data for rsi calc
    coin[`data${interval}`] = coin[`data${interval}`].slice(-max)

    addExtraCandleData(coin, interval, limit)

    // send data to client
    callback()
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
export const getData = async (callback: () => void) => {
  //-=========================
  // preparar la data para mostrar
  // obtener symbols/lista de coins
  await getSymbols()
  callback()
  // llenar price
  await populatePrice()
  callback()

  if (sockets.length > 0) {
    // sockets installed, clearing
    unsubscribeAll()
  }

  // data inicial
  for (let coin of symbols) {
    await getCandles(coin, '5m', RSI_LENGTH)
    // callback()
    await getCandles(coin, '15m', RSI_LENGTH)
    // callback()
    await getCandles(coin, '30m', RSI_LENGTH)
    // callback()
    await getCandles(coin, '1h', RSI_LENGTH)
    // callback()
    await getCandles(coin, '4h', RSI_LENGTH)
    // callback()
    await getCandles(coin, '1d', RSI_LENGTH)
    // callback()
    await getCandles(coin, '1w', RSI_LENGTH)
    callback()
    // console.log('symbol', symbols[0])
  }
  const allCoins = symbols.map(coin => coin.symbol)
  // install socket t pull data periodically n save/recalc/emit

  console.log('install Sockets')

  if (USE_FUTURES_DATA) {
    sockets.push(
      client.ws.futuresCandles(allCoins, '5m', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '15m', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '30m', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '1h', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '4h', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '1d', addCandleData(RSI_LENGTH, callback)),
      client.ws.futuresCandles(allCoins, '1w', addCandleData(RSI_LENGTH, callback))
    )
  } else {
    sockets.push(
      client.ws.candles(allCoins, '5m', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '15m', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '30m', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '1h', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '4h', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '1d', addCandleData(RSI_LENGTH, callback)),
      client.ws.candles(allCoins, '1w', addCandleData(RSI_LENGTH, callback))
    )
  }

  console.log('sockets installed', sockets.length)
  // console.log('send data', getDataToSend())
}

export const getDataToSend = () => {
  return symbols.map(coin => ({
    symbol: coin.symbol,
    minNotional: coin.minNotional,
    price: coin.price,
    data5m: coin.data5m,
    // data15m: coin.data15m,
    // data1d: coin.data1d,
    // data1w: coin.data1w,
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
    isBiggerThanPrevious1w: coin.isBiggerThanPrevious1w
  }))
}

export const unsubscribeAll = () => {
  sockets.forEach(unsubscribe => unsubscribe())
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
