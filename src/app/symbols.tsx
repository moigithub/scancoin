'use client'

import {
  ChangeEvent,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import io, { Socket } from 'socket.io-client'
import { Chart } from './chart'
import Image from 'next/image'

interface CandleData {
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
  isRedCandle: boolean
  isGreenCandle: boolean
  isStopCandle: boolean
  isPowerCandle: boolean
  isBiggerThanPrevious: boolean
  prev10CandleVolumeCount: number
}

type Symbol = {
  symbol: string
  minNotional: string
  price: number
  data5m: CandleData[]
  data15m: CandleData[]
  data30m: CandleData[]
  data1h: CandleData[]
  data4h: CandleData[]
  data1d: CandleData[]
  data1w: CandleData[]
}
enum ALERT_TYPE {
  'alert' = 'alert',
  'volume' = 'volume',
  'velotas' = 'velotas',
  'bollingerup' = 'bolli-up',
  'bollingerdown' = 'bolli-down'
}

let socket: Socket
let sndPowa: any = null
let sndTick: any = null
let sndCompra: any = null
let sndVenta: any = null
let sndVelota: any = null
let sndVolume: any = null
let sndBoliUp: any = null
let sndBoliDown: any = null

export const Symbols = () => {
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [volumeCount, setVolumeCount] = useState(3)
  const [minRSIFilter, setMinRSIFilter] = useState(30)
  const [maxRSIFilter, setMaxRSIFilter] = useState(70)
  const [RSILenFilter, setRSILenFilter] = useState(14)
  const [volumeLenFilter, setVolumeLenFilter] = useState(30)
  const [volumeFactorFilter, setVolumeFactorFilter] = useState(2.5)
  const [bbCandlePercentOutFilter, setBbCandlePercentOutFilter] = useState(40)

  const [pushFilter, setPushFilter] = useState(false)
  const [searchOnlyFilter, setSearchOnlyFilter] = useState(false)
  const [volumeCountFilter, setVolumeCountFilter] = useState(false)

  const [overBoughtFilter, setOverBoughtFilter] = useState(true)
  const [overSoldFilter, setOverSoldFilter] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([
    // {
    //   type: ALERT_TYPE.alert,
    //   symbol: 'test',
    //   interval: '5m',
    //   rsi: 2,
    //   prev10CandleVolumeCount: 1,
    //   time: '123'
    // },
  ])
  const [volumeAlerts, setVolumeAlerts] = useState<any[]>([])
  const [velotaAlerts, setVelotaAlerts] = useState<any[]>([])
  const [bollingerAlerts, setBollingerAlerts] = useState<any[]>([])

  const [rsiSelectedSort, setRsiSelectedSort] = useState('5m:desc')

  const [btcData0, setBtcData0] = useState<any[]>([])
  const [btcData1, setBtcData1] = useState<any[]>([])
  const [btcData2, setBtcData2] = useState<any[]>([])
  const [chartData1, setChartData1] = useState<any[]>([])
  const [chartData2, setChartData2] = useState<any[]>([])
  const [chartData3, setChartData3] = useState<any[]>([])

  const btcCoin0 = useRef('BTCUSDT:5m')
  const btcCoin1 = useRef('BTCUSDT:15m')
  const btcCoin2 = useRef('BTCUSDT:30m')
  const selectedCoin1 = useRef('BTCUSDT:1h')
  const selectedCoin2 = useRef('BTCUSDT:4h')
  const selectedCoin3 = useRef('BTCUSDT:1d')
  const pingInterval = useRef<NodeJS.Timer>()

  useEffect(() => {
    sndPowa = new Audio(
      'data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='
    )
    sndVenta = new Audio('./ve.mp3')
    sndCompra = new Audio('./co.mp3')
    sndPowa = new Audio('./powercandle.m4a')
    sndVelota = new Audio('./velota.m4a')
    sndVolume = new Audio('./volume.m4a')
    sndBoliUp = new Audio('./boliup.m4a')
    sndBoliDown = new Audio('./bolidown.m4a')

    const init = async () => {
      await socketInitializer()
      pingInterval.current = setInterval(() => {
        socket.emit('ping')
      }, 20 * 1000) //20 seconds

      // initialize rsi
      socket.emit('setMinRSI', minRSIFilter)
      socket.emit('setMaxRSI', maxRSIFilter)
      socket.emit('setRSILength', RSILenFilter)
      // volume factor (used to calculate the candle strength)
      socket.emit('setVolumeLength', volumeLenFilter)
      socket.emit('setVolumeFactor', volumeFactorFilter)
      socket.emit('setBBCandlePercentOut', bbCandlePercentOutFilter)
    }

    init()

    return () => {
      clearInterval(pingInterval.current)
      socket.emit('bye')
      socket.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const chartUpdater = (
      selectedCoin: MutableRefObject<string>,
      setter: (value: SetStateAction<any[]>) => void
    ) => {
      if (selectedCoin.current) {
        const parts = selectedCoin.current.split(':')
        const symbol = parts[0]
        const interval = parts[1]
        // console.log('updating chart ', parts)
        const data = symbols.find(coin => coin.symbol === symbol)
        if (data) {
          switch (interval) {
            case '5m':
              setter(data.data5m)
              break
            case '15m':
              setter(data.data15m)
              break
            case '30m':
              setter(data.data30m)
              break
            case '1h':
              setter(data.data1h)
              break
            case '4h':
              setter(data.data4h)
              break
            case '1d':
              setter(data.data1d)
              break
            // case '1w':
            //   setter(data.data1w)
            //   break
            default:
              console.log('wrong inteval passed', interval)
          }
        } else {
          console.log('no data with that symbol', selectedCoin.current)
        }
      }
    }

    // update chart data
    chartUpdater(btcCoin0, setBtcData0) //btcusdt
    chartUpdater(btcCoin1, setBtcData1) //btcusdt
    chartUpdater(btcCoin2, setBtcData2) //btcusdt
    chartUpdater(selectedCoin1, setChartData1)
    chartUpdater(selectedCoin2, setChartData2)
    chartUpdater(selectedCoin3, setChartData3)
  }, [symbols])

  async function socketInitializer() {
    await fetch('/api/socket')

    socket = io({ path: '/api/socket_io' })

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('pong', (response: any) => {
      console.log('pong', response, new Date(response).toISOString())
    })

    socket.on('data', (data: Symbol[]) => {
      // console.log('received data0', selectedCoin1.current, data)
      setSymbols(data)
    })

    // powercandle with rsi and bigger than previous
    socket.on('alert:powercandle:5m', (coin: any) => {
      setAlerts(m => [formatAlertMsg('5m', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    socket.on('alert:powercandle:15m', (coin: any) => {
      setAlerts(m => [formatAlertMsg('15m', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    socket.on('alert:powercandle:30m', (coin: any) => {
      setAlerts(m => [formatAlertMsg('30m', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    socket.on('alert:powercandle:1h', (coin: any) => {
      setAlerts(m => [formatAlertMsg('1h', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    socket.on('alert:powercandle:4h', (coin: any) => {
      setAlerts(m => [formatAlertMsg('4h', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    socket.on('alert:powercandle:1d', (coin: any) => {
      setAlerts(m => [formatAlertMsg('1d', ALERT_TYPE.alert, coin), ...m].slice(-20))
      if (sndPowa) sndPowa.play()
    })
    // socket.on('alert:powercandle:1w', (coin: any) => {
    //   setAlerts(m => [formatAlertMsg('1w', ALERT_TYPE.alert, coin), ...m].slice(-20))
    //   if (sndPowa) sndPowa.play()
    // })

    // velotas (powercandle only without rsi)

    // socket.on('alert:strongcandle:5m', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('5m', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:15m', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('15m', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:30m', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('30m', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:1h', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('1h', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:4h', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('4h', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:1d', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('1d', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })
    // socket.on('alert:strongcandle:1w', (coin: any) => {
    //   setVelotaAlerts(m => [formatAlertMsg('1w', ALERT_TYPE.velotas, coin), ...m].slice(-20))
    //   if (sndVelota) sndVelota.play()
    // })

    // volume count alert
    // socket.on('alert:volumecount:5m', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('5m', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:15m', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('15m', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:30m', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('30m', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:1h', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('1h', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:4h', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('4h', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:1d', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('1d', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })
    // socket.on('alert:volumecount:1w', (coin: any) => {
    //   setVolumeAlerts(m => [formatAlertMsg('1w', ALERT_TYPE.volume, coin), ...m].slice(-20))
    //   if (sndVolume) sndVolume.play()
    // })

    // bolinger cross up alert
    socket.on('alert:bollingerUp:5m', (coin: any) => {
      setBollingerAlerts(m => [formatAlertMsg('5m', ALERT_TYPE.bollingerup, coin), ...m].slice(-20))
      if (sndBoliUp) sndBoliUp.play()
    })
    socket.on('alert:bollingerUp:15m', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('15m', ALERT_TYPE.bollingerup, coin), ...m].slice(-20)
      )
      if (sndBoliUp) sndBoliUp.play()
    })
    socket.on('alert:bollingerUp:30m', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('30m', ALERT_TYPE.bollingerup, coin), ...m].slice(-20)
      )
      if (sndBoliUp) sndBoliUp.play()
    })
    socket.on('alert:bollingerUp:1h', (coin: any) => {
      setBollingerAlerts(m => [formatAlertMsg('1h', ALERT_TYPE.bollingerup, coin), ...m].slice(-20))
      if (sndBoliUp) sndBoliUp.play()
    })
    socket.on('alert:bollingerUp:4h', (coin: any) => {
      setBollingerAlerts(m => [formatAlertMsg('4h', ALERT_TYPE.bollingerup, coin), ...m].slice(-20))
      if (sndBoliUp) sndBoliUp.play()
    })
    socket.on('alert:bollingerUp:1d', (coin: any) => {
      setBollingerAlerts(m => [formatAlertMsg('1d', ALERT_TYPE.bollingerup, coin), ...m].slice(-20))
      if (sndBoliUp) sndBoliUp.play()
    })
    // socket.on('alert:bollingerUp:1w', (coin: any) => {
    //   setBollingerAlerts(m => [formatAlertMsg('1w', ALERT_TYPE.bollingerup, coin), ...m].slice(-20))
    //   if (sndBoliUp) sndBoliUp.play()
    // })

    // bolinger cross down alert
    socket.on('alert:bollingerDown:5m', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('5m', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    socket.on('alert:bollingerDown:15m', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('15m', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    socket.on('alert:bollingerDown:30m', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('30m', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    socket.on('alert:bollingerDown:1h', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('1h', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    socket.on('alert:bollingerDown:4h', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('4h', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    socket.on('alert:bollingerDown:1d', (coin: any) => {
      setBollingerAlerts(m =>
        [formatAlertMsg('1d', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
      )
      if (sndBoliDown) sndBoliDown.play()
    })
    // socket.on('alert:bollingerDown:1w', (coin: any) => {
    //   setBollingerAlerts(m =>
    //     [formatAlertMsg('1w', ALERT_TYPE.bollingerdown, coin), ...m].slice(-20)
    //   )
    //   if (sndBoliDown) sndBoliDown.play()
    // })
  }

  const formatAlertMsg = (interval: string, type: string, coin: any) => {
    const time = new Date()

    const totalCandles = coin[`data${interval}`].length
    const lastCandle = coin[`data${interval}`][totalCandles - 1]

    const data = {
      type,
      interval,
      ...lastCandle,
      ...coin,
      time: time.toLocaleTimeString('en-US')
    }
    console.log('alert', data)
    return data
  }

  const getBorderColorByAlertType = (alertType: ALERT_TYPE) => {
    switch (alertType) {
      case ALERT_TYPE.alert:
        return 'border-red-500'
      case ALERT_TYPE.volume:
        return 'border-amber-500'
      case ALERT_TYPE.velotas:
        return 'border-blue-500'
      case ALERT_TYPE.bollingerup:
      case ALERT_TYPE.bollingerdown:
        return 'border-green-500'

      default:
        return ''
    }
  }

  const renderMessage = (msg: any, index: number) => {
    // console.log('renderalert', msg)
    return (
      <li
        key={index}
        className={`my-1 flex flex-col border ${getBorderColorByAlertType(msg.type)}`}
      >
        <div className='buttons flex'>
          <span
            className='bg-blue-200 hover:bg-blue-400 text-black text-xs cursor-pointer mx-0.5 px-1'
            onClick={() => handleChangeInterval1(msg.symbol, msg.interval)}
          >
            1
          </span>
          <span
            className='bg-blue-200 hover:bg-blue-400 text-black text-xs cursor-pointer mx-1 px-1'
            onClick={() => handleChangeInterval2(msg.symbol, msg.interval)}
          >
            2
          </span>
          <span
            className='bg-blue-200 hover:bg-blue-400 text-black text-xs cursor-pointer mx-1 px-1'
            onClick={() => handleChangeInterval3(msg.symbol, msg.interval)}
          >
            3
          </span>
          <span>{msg.type}</span>
        </div>
        <a
          href={`https://www.tradingview.com/chart?symbol=BINANCE:${getTradingViewSymbol(
            msg.symbol
          )}&interval=${getTradingViewInterval(msg.interval)}`}
          target='_blank'
        >
          <p className='mx-2'>{msg.time}</p>
          <p className='mx-2'>
            {msg.symbol} {msg.interval}
          </p>
          <p className='mx-2'>RSI: {msg.rsi}</p>
          <p className='mx-2'>VolCount: {msg.prev10CandleVolumeCount}</p>
          {/* <p className='mx-2'>Price:{msg.close}</p> */}
        </a>
      </li>
    )
  }

  const handleSearchOnlyFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchOnlyFilter(e.target.checked)
  }

  const handleVolumeCountFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setVolumeCountFilter(e.target.checked)
  }

  const handlePushFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setPushFilter(e.target.checked)
  }

  const handleMinRSIFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setMinRSIFilter(value)
    socket.emit('setMinRSI', value)
  }
  const handleMaxRSIFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setMaxRSIFilter(value)
    socket.emit('setMaxRSI', value)
  }
  const handleRSILenFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setRSILenFilter(value)
    socket.emit('setRSILength', value)
  }
  const handleVolumeLenFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setVolumeLenFilter(value)
    socket.emit('setVolumeLength', value)
  }
  const handleVolumeFactorFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setVolumeFactorFilter(value)
    socket.emit('setVolumeFactor', value)
  }
  const handleBbCandlePercentOutFilter = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setBbCandlePercentOutFilter(value)
    socket.emit('setBBCandlePercentOut', value)
  }

  const handleOverBoughtFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setOverBoughtFilter(e.target.checked)
  }

  const handleOverSoldFilter = (e: ChangeEvent<HTMLInputElement>) => {
    setOverSoldFilter(e.target.checked)
  }

  const handleViewChart0 = (coin: string) => {
    console.log('select ', coin)
    btcCoin0.current = coin
  }
  const handleViewChart1 = (coin: string) => {
    console.log('select ', coin)
    btcCoin1.current = coin
  }
  const handleViewChart2 = (coin: string) => {
    console.log('select ', coin)
    btcCoin2.current = coin
  }

  const handleChangeInterval1 = (coin: string, interval: string) => {
    console.log('select ', interval)
    if (!selectedCoin1.current) {
      selectedCoin1.current = 'BTCUSDT:5m'
    }
    const parts = selectedCoin1.current.split(':')
    const symbol = coin || parts[0]

    selectedCoin1.current = symbol + ':' + interval
  }

  const handleChangeInterval2 = (coin: string, interval: string) => {
    console.log('select2 ', interval)
    if (!selectedCoin2.current) {
      selectedCoin2.current = 'BTCUSDT:5m'
    }
    const parts = selectedCoin2.current.split(':')
    const symbol = coin || parts[0]

    selectedCoin2.current = symbol + ':' + interval
  }

  const handleChangeInterval3 = (coin: string, interval: string) => {
    console.log('select3 ', interval)
    if (!selectedCoin3.current) {
      selectedCoin3.current = 'BTCUSDT:5m'
    }
    const parts = selectedCoin3.current.split(':')
    const symbol = coin || parts[0]

    selectedCoin3.current = symbol + ':' + interval
  }

  const handleSearchFilter = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('search', e.target.value)
    setSearchFilter(e.target.value)
  }

  const handleVolumeCount = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('search', e.target.value)
    setVolumeCount(Number(e.target.value))
  }

  const renderIcons = (coin: any, interval: string) => {
    let status = []
    // console.log('rendericons coin', coin, interval)
    const totalCandles = coin[`data${interval}`].length

    if (totalCandles === 0) return null

    const lastCandle = coin[`data${interval}`][totalCandles - 1]
    const prevCandle = coin[`data${interval}`][totalCandles - 2]

    if (lastCandle.isStopCandle || prevCandle.isStopCandle) {
      status.push(
        <Image
          alt='stop'
          key={`${coin.symbol}${interval}:stop`}
          src='/assets/stop.png'
          width={24}
          height={24}
        />
      )
    } //'Stop'

    //' SuperPush' // vol inc, bigger candle
    if (lastCandle.isPowerCandle && lastCandle.isBiggerThanPrevious) {
      // entrando volumen

      status.push(
        <span
          key={`${coin.symbol}${interval}:last:superpush`}
          style={{
            padding: 0,
            flexShrink: 0,
            transform: lastCandle.isRedCandle ? 'rotate(90deg)' : 'none'
          }}
        >
          <Image alt='superpush' src='/assets/superpush.png' width={24} height={24} />
        </span>
      )
    }
    if (prevCandle.isPowerCandle && prevCandle.isBiggerThanPrevious) {
      // entrando volumen

      status.push(
        <span
          key={`${coin.symbol}${interval}:prev:superpush`}
          style={{
            padding: 0,
            flexShrink: 0,
            transform: prevCandle.isRedCandle ? 'rotate(90deg)' : 'none'
          }}
        >
          <Image alt='superpush' src='/assets/superpush.png' width={24} height={24} />
        </span>
      )
    }

    //'Push' // vol inc
    if (lastCandle.isPowerCandle && !lastCandle.isBiggerThanPrevious) {
      status.push(
        <span
          key={`${coin.symbol}${interval}:last:push`}
          style={{
            padding: 0,
            flexShrink: 0,
            transform: lastCandle.isRedCandle ? 'rotate(90deg)' : 'none'
          }}
        >
          <Image alt='push' src='/assets/push.png' width={24} height={24} />
        </span>
      )
    }

    if (prevCandle.isPowerCandle && !prevCandle.isBiggerThanPrevious) {
      status.push(
        <span
          key={`${coin.symbol}${interval}:prev:push`}
          style={{
            padding: 0,
            flexShrink: 0,
            transform: prevCandle.isRedCandle ? 'rotate(90deg)' : 'none'
          }}
        >
          <Image alt='push' src='/assets/push.png' width={24} height={24} />
        </span>
      )
    }
    return status
  }

  const handleSelectSort = (header: string) => {
    //header = 5m, 15m, 30m, 1h, 4h, 1d, 1w
    const currentSort = rsiSelectedSort.split(':')
    let newSort = rsiSelectedSort
    if (currentSort[0] === header) {
      const mode = currentSort[1] === 'asc' ? 'desc' : 'asc'
      newSort = header + ':' + mode
    } else {
      newSort = header + ':' + 'desc'
    }
    setRsiSelectedSort(newSort)
  }

  let filterSymbols = symbols.filter(s => s.symbol !== 'BTCUSDT')

  const BTC = symbols.filter(s => s.symbol === 'BTCUSDT')

  if (searchFilter) {
    filterSymbols = filterSymbols.filter(s => s.symbol.includes(searchFilter.toUpperCase()))
  }

  if (searchFilter) {
    filterSymbols = filterSymbols.filter(s => s.symbol.includes(searchFilter.toUpperCase()))
  }

  if (!searchOnlyFilter) {
    if (pushFilter) {
      filterSymbols = filterSymbols.filter(s => {
        const lastCandle5m = s[`data5m`][s[`data5m`].length - 1]
        const lastCandle15m = s[`data15m`][s[`data15m`].length - 1]
        const lastCandle30m = s[`data30m`][s[`data30m`].length - 1]
        const lastCandle1h = s[`data1h`][s[`data1h`].length - 1]
        const lastCandle4h = s[`data4h`][s[`data4h`].length - 1]
        const lastCandle1d = s[`data1d`][s[`data1d`].length - 1]
        const lastCandle1w = s[`data1w`][s[`data1w`].length - 1]

        return (
          lastCandle5m?.isPowerCandle ||
          lastCandle15m?.isPowerCandle ||
          lastCandle30m?.isPowerCandle ||
          lastCandle1h?.isPowerCandle ||
          lastCandle4h?.isPowerCandle ||
          lastCandle1d?.isPowerCandle ||
          lastCandle1w?.isPowerCandle
        )
      })
    }

    filterSymbols = filterSymbols.filter(s => s.symbol.includes(searchFilter.toUpperCase()))

    if (overBoughtFilter && overSoldFilter) {
      filterSymbols = filterSymbols.filter(s => {
        return (
          s.data5m[s.data5m.length - 1]?.rsi > maxRSIFilter ||
          s.data15m[s.data15m.length - 1]?.rsi > maxRSIFilter ||
          s.data30m[s.data30m.length - 1]?.rsi > maxRSIFilter ||
          s.data1h[s.data1h.length - 1]?.rsi > maxRSIFilter ||
          s.data4h[s.data4h.length - 1]?.rsi > maxRSIFilter ||
          s.data1d[s.data1d.length - 1]?.rsi > maxRSIFilter ||
          // s.data1w[s.data1w.length - 1]?.rsi > maxRSIFilter ||
          s.data5m[s.data5m.length - 1]?.rsi < minRSIFilter ||
          s.data15m[s.data15m.length - 1]?.rsi < minRSIFilter ||
          s.data30m[s.data30m.length - 1]?.rsi < minRSIFilter ||
          s.data1h[s.data1h.length - 1]?.rsi < minRSIFilter ||
          s.data4h[s.data4h.length - 1]?.rsi < minRSIFilter ||
          s.data1d[s.data1d.length - 1]?.rsi < minRSIFilter
          // || s.data1w[s.data1w.length - 1]?.rsi < minRSIFilter
        )
      })
    } else if (overBoughtFilter) {
      filterSymbols = filterSymbols.filter(s => {
        return (
          s.data5m[s.data5m.length - 1]?.rsi > maxRSIFilter ||
          s.data15m[s.data15m.length - 1]?.rsi > maxRSIFilter ||
          s.data30m[s.data30m.length - 1]?.rsi > maxRSIFilter ||
          s.data1h[s.data1h.length - 1]?.rsi > maxRSIFilter ||
          s.data4h[s.data4h.length - 1]?.rsi > maxRSIFilter ||
          s.data1d[s.data1d.length - 1]?.rsi > maxRSIFilter
          // ||s.data1w[s.data1w.length - 1]?.rsi > maxRSIFilter
        )
      })
    } else if (overSoldFilter) {
      filterSymbols = filterSymbols.filter(s => {
        return (
          (s.data5m[s.data5m.length - 1]?.rsi > 0 &&
            s.data5m[s.data5m.length - 1]?.rsi < minRSIFilter) ||
          (s.data15m[s.data15m.length - 1]?.rsi > 0 &&
            s.data15m[s.data15m.length - 1]?.rsi < minRSIFilter) ||
          (s.data30m[s.data30m.length - 1]?.rsi > 0 &&
            s.data30m[s.data30m.length - 1]?.rsi < minRSIFilter) ||
          (s.data1h[s.data1h.length - 1]?.rsi > 0 &&
            s.data1h[s.data1h.length - 1]?.rsi < minRSIFilter) ||
          (s.data4h[s.data4h.length - 1]?.rsi > 0 &&
            s.data4h[s.data4h.length - 1]?.rsi < minRSIFilter) ||
          (s.data1d[s.data1d.length - 1]?.rsi > 0 &&
            s.data1d[s.data1d.length - 1]?.rsi < minRSIFilter)
          // || (s.data1w[s.data1w.length - 1]?.rsi > 0 &&
          //   s.data1w[s.data1w.length - 1]?.rsi < minRSIFilter)
        )
      })
    }

    if (volumeCountFilter) {
      filterSymbols = filterSymbols.filter(s => {
        return (
          s.data5m[s.data5m.length - 1]?.prev10CandleVolumeCount >= volumeCount ||
          s.data15m[s.data15m.length - 1]?.prev10CandleVolumeCount >= volumeCount ||
          s.data30m[s.data30m.length - 1]?.prev10CandleVolumeCount >= volumeCount ||
          s.data1h[s.data1h.length - 1]?.prev10CandleVolumeCount >= volumeCount ||
          s.data4h[s.data4h.length - 1]?.prev10CandleVolumeCount >= volumeCount ||
          s.data1d[s.data1d.length - 1]?.prev10CandleVolumeCount >= volumeCount
          //  ||s.data1w[s.data1w.length - 1]?.prev10CandleVolumeCount >= volumeCount
        )
      })
    }
  }

  const getData = (d: any) => {
    return {
      ...d,
      symbol: d.symbol,
      price: d.price,
      rsi5m: d.data5m[d.data5m.length - 1]?.rsi ?? 0,
      rsi15m: d.data15m[d.data15m.length - 1]?.rsi ?? 0,
      rsi30m: d.data30m[d.data30m.length - 1]?.rsi ?? 0,
      rsi1h: d.data1h[d.data1h.length - 1]?.rsi ?? 0,
      rsi4h: d.data4h[d.data4h.length - 1]?.rsi ?? 0,
      rsi1d: d.data1d[d.data1d.length - 1]?.rsi ?? 0,
      // rsi1w: d.data1w[d.data1w.length - 1]?.rsi ?? 0,
      prev10CandleVolumeCount5m: d.data5m[d.data5m.length - 1]?.prev10CandleVolumeCount ?? 0,
      prev10CandleVolumeCount15m: d.data15m[d.data15m.length - 1]?.prev10CandleVolumeCount ?? 0,
      prev10CandleVolumeCount30m: d.data30m[d.data30m.length - 1]?.prev10CandleVolumeCount ?? 0,
      prev10CandleVolumeCount1h: d.data1h[d.data1h.length - 1]?.prev10CandleVolumeCount ?? 0,
      prev10CandleVolumeCount4h: d.data4h[d.data4h.length - 1]?.prev10CandleVolumeCount ?? 0,
      prev10CandleVolumeCount1d: d.data1d[d.data1d.length - 1]?.prev10CandleVolumeCount ?? 0,
      // prev10CandleVolumeCount1w: d.data1w[d.data1w.length - 1]?.prev10CandleVolumeCount ?? 0,
      isRedCandle5m: d.data5m[d.data5m.length - 1]?.isRedCandle ?? 0,
      isRedCandle15m: d.data15m[d.data15m.length - 1]?.isRedCandle ?? 0,
      isRedCandle30m: d.data30m[d.data30m.length - 1]?.isRedCandle ?? 0,
      isRedCandle1h: d.data1h[d.data1h.length - 1]?.isRedCandle ?? 0,
      isRedCandle4h: d.data4h[d.data4h.length - 1]?.isRedCandle ?? 0,
      isRedCandle1d: d.data1d[d.data1d.length - 1]?.isRedCandle ?? 0,
      // isRedCandle1w: d.data1w[d.data1w.length - 1]?.isRedCandle ?? 0,

      isStopCandle5m: d.data5m[d.data5m.length - 1]?.isStopCandle ?? 0,
      isStopCandle15m: d.data15m[d.data15m.length - 1]?.isStopCandle ?? 0,
      isStopCandle30m: d.data30m[d.data30m.length - 1]?.isStopCandle ?? 0,
      isStopCandle1h: d.data1h[d.data1h.length - 1]?.isStopCandle ?? 0,
      isStopCandle4h: d.data4h[d.data4h.length - 1]?.isStopCandle ?? 0,
      isStopCandle1d: d.data1d[d.data1d.length - 1]?.isStopCandle ?? 0,
      // isStopCandle1w: d.data1w[d.data1w.length - 1]?.isStopCandle ?? 0,

      isPowerCandle5m: d.data5m[d.data5m.length - 1]?.isPowerCandle ?? 0,
      isPowerCandle15m: d.data15m[d.data15m.length - 1]?.isPowerCandle ?? 0,
      isPowerCandle30m: d.data30m[d.data30m.length - 1]?.isPowerCandle ?? 0,
      isPowerCandle1h: d.data1h[d.data1h.length - 1]?.isPowerCandle ?? 0,
      isPowerCandle4h: d.data4h[d.data4h.length - 1]?.isPowerCandle ?? 0,
      isPowerCandle1d: d.data1d[d.data1d.length - 1]?.isPowerCandle ?? 0,
      // isPowerCandle1w: d.data1w[d.data1w.length - 1]?.isPowerCandle ?? 0,

      isBiggerThanPrevious5m: d.data5m[d.data5m.length - 1]?.isBiggerThanPrevious ?? 0,
      isBiggerThanPrevious15m: d.data15m[d.data15m.length - 1]?.isBiggerThanPrevious ?? 0,
      isBiggerThanPrevious30m: d.data30m[d.data30m.length - 1]?.isBiggerThanPrevious ?? 0,
      isBiggerThanPrevious1h: d.data1h[d.data1h.length - 1]?.isBiggerThanPrevious ?? 0,
      isBiggerThanPrevious4h: d.data4h[d.data4h.length - 1]?.isBiggerThanPrevious ?? 0,
      isBiggerThanPrevious1d: d.data1d[d.data1d.length - 1]?.isBiggerThanPrevious ?? 0
      // isBiggerThanPrevious1w: d.data1w[d.data1w.length - 1]?.isBiggerThanPrevious ?? 0
    }
  }

  const dataSymbols = filterSymbols.map(getData).sort((a: any, b: any) => {
    const currentSort = rsiSelectedSort.split(':')
    if (currentSort[0] === '5m') {
      if (currentSort[1] === 'asc') {
        return a.rsi5m - b.rsi5m
      } else {
        return b.rsi5m - a.rsi5m
      }
    } else if (currentSort[0] === '15m') {
      if (currentSort[1] === 'asc') {
        return a.rsi15m - b.rsi15m
      } else {
        return b.rsi15m - a.rsi15m
      }
    } else if (currentSort[0] === '30m') {
      if (currentSort[1] === 'asc') {
        return a.rsi30m - b.rsi30m
      } else {
        return b.rsi30m - a.rsi30m
      }
    } else if (currentSort[0] === '1h') {
      if (currentSort[1] === 'asc') {
        return a.rsi1h - b.rsi1h
      } else {
        return b.rsi1h - a.rsi1h
      }
    } else if (currentSort[0] === '4h') {
      if (currentSort[1] === 'asc') {
        return a.rsi4h - b.rsi4h
      } else {
        return b.rsi4h - a.rsi4h
      }
    } else if (currentSort[0] === '1d') {
      if (currentSort[1] === 'asc') {
        return a.rsi1d - b.rsi1d
      } else {
        return b.rsi1d - a.rsi1d
      }
    }
    // else if (currentSort[0] === '1w') {
    //   if (currentSort[1] === 'asc') {
    //     return a.rsi1w - b.rsi1w
    //   } else {
    //     return b.rsi1w - a.rsi1w
    //   }
    // }
    return 0
  })
  const dataBTC = BTC.map(getData)

  return (
    <div className='p-3 flex flex-col'>
      <div className='head flex '>
        <div className='charts flex flex-col'>
          <div className='chart-group flex'>
            <div className='chart m-2 flex-1' id='chart-btc0'>
              <div className='chart-header flex'>
                <h3>{btcCoin0.current}</h3>
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart0(`BTCUSDT:1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart0(`BTCUSDT:1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={btcData0} ema20 sma50 sma200 height={200} />
            </div>

            <div className='chart m-2 flex-1' id='chart-btc1'>
              <div className='chart-header flex'>
                <h3>{btcCoin1.current}</h3>
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart1(`BTCUSDT:1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart1(`BTCUSDT:1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={btcData1} ema20 sma50 sma200 height={200} />
            </div>

            <div className='chart m-2 flex-1' id='chart-btc2'>
              <div className='chart-header flex'>
                <h3>{btcCoin2.current}</h3>
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleViewChart2(`BTCUSDT:1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleViewChart2(`BTCUSDT:1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={btcData2} ema20 sma50 sma200 height={200} />
            </div>
          </div>
          <div className='chart-group flex items-start'>
            <div className='chart m-2 flex-1' id='chart-1'>
              <div className='chart-header flex'>
                {selectedCoin1.current && (
                  <a
                    href={`https://www.tradingview.com/chart?symbol=BINANCE:${getTradingViewSymbol(
                      selectedCoin1.current.split(':')[0]
                    )}&interval=${getTradingViewInterval(selectedCoin1.current.split(':')[1])}`}
                    target='_blank'
                  >
                    {selectedCoin1.current}
                  </a>
                )}
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1('', `1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1('', `1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={chartData1} />
            </div>

            <div className='chart m-2 flex-1' id='chart-2'>
              <div className='chart-header flex'>
                {selectedCoin2.current && (
                  <a
                    href={`https://www.tradingview.com/chart?symbol=BINANCE:${getTradingViewSymbol(
                      selectedCoin2.current.split(':')[0]
                    )}&interval=${getTradingViewInterval(selectedCoin2.current.split(':')[1])}`}
                    target='_blank'
                  >
                    {selectedCoin2.current}
                  </a>
                )}
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2('', `1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2('', `1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={chartData2} />
            </div>

            <div className='chart m-2 flex-1' id='chart-3'>
              <div className='chart-header flex'>
                {selectedCoin3.current && (
                  <a
                    href={`https://www.tradingview.com/chart?symbol=BINANCE:${getTradingViewSymbol(
                      selectedCoin3.current.split(':')[0]
                    )}&interval=${getTradingViewInterval(selectedCoin3.current.split(':')[1])}`}
                    target='_blank'
                  >
                    {selectedCoin3.current}
                  </a>
                )}
                <div className='btc-btns mx-5 '>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `5m`)}
                  >
                    5m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `15m`)}
                  >
                    15m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `30m`)}
                  >
                    30m
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `1h`)}
                  >
                    1h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `4h`)}
                  >
                    4h
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3('', `1d`)}
                  >
                    1d
                  </span>
                  {/* <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3('', `1w`)}
                    >
                      1w
                    </span> */}
                </div>
              </div>
              <Chart data={chartData3} />
            </div>
          </div>
        </div>
        <div className='alerts flex'>
          <div className='flex flex-col'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-sm text-white font-bold mx-2 py-1 px-2 rounded'
              onClick={() => setBollingerAlerts([])}
            >
              Clear Boli alerts
            </button>
            <ul className='flex-1 overflow-y-auto text-xs h-[500px]'>
              changeColor, lastCandleHigherVol, biggerThanPrev, rsi
              {alerts.map(renderMessage)}
            </ul>
          </div>
          {/* <ul className='overflow-y-auto'>{velotaAlerts.map(renderMessage)}</ul> */}
          <div className='flex flex-col'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold mx-2 py-1 px-2 rounded'
              onClick={() => setAlerts([])}
            >
              Clear alerts
            </button>
            <ul className='flex-1 overflow-y-auto text-xs h-[500px]'>
              crossBBBand, candlePercentOutBB, rsi
              {bollingerAlerts.map(renderMessage)}
            </ul>
          </div>
          {/* <ul className='overflow-y-auto'>{volumeAlerts.map(renderMessage)}</ul> */}
        </div>
      </div>

      <div className='filter flex justify-between items-center'>
        <div className='search my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='filter-search'
          >
            Search symbol
          </label>
          <input
            type='checkbox'
            id='filter-searchOnly'
            checked={searchOnlyFilter}
            onChange={handleSearchOnlyFilter}
          />
          <input
            type='text'
            id='filter-search'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            value={searchFilter}
            onChange={handleSearchFilter}
          />
        </div>
        <div className='rsi-min my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='rsi-min'
          >
            Min RSI (oversold)
          </label>
          <input
            type='number'
            id='rsi-min'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={0}
            max={100}
            value={minRSIFilter}
            onChange={handleMinRSIFilter}
          />
        </div>
        <div className='rsi-max my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='rsi-max'
          >
            Max RSI (overbought)
          </label>
          <input
            type='number'
            id='rsi-max'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={0}
            max={100}
            value={maxRSIFilter}
            onChange={handleMaxRSIFilter}
          />
        </div>
        <div className='rsi-len my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='rsi-len'
          >
            RSI Len
          </label>
          <input
            type='number'
            id='rsi-len'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={1}
            max={100}
            value={RSILenFilter}
            onChange={handleRSILenFilter}
          />
        </div>
        <div className='vol-len my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='vol-len'
          >
            Volume Len
          </label>
          <input
            type='number'
            id='vol-len'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={5}
            max={100}
            value={volumeLenFilter}
            onChange={handleVolumeLenFilter}
          />
        </div>
        <div className='vol-factor my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='vol-factor'
          >
            Volume factor
          </label>
          <input
            type='number'
            id='vol-factor'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={1}
            max={3}
            step={0.1}
            value={volumeFactorFilter}
            onChange={handleVolumeFactorFilter}
          />
        </div>
        <div className='bb-candle-percent-out my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='bb-candle-percent-out'
          >
            Bolinger % candle out
          </label>
          <input
            type='number'
            id='bb-candle-percent-out'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            min={30}
            max={99}
            value={bbCandlePercentOutFilter}
            onChange={handleBbCandlePercentOutFilter}
          />
        </div>

        <div className='search my-2'>
          <label
            className='mr-2 text-sm font-medium text-gray-900 dark:text-white'
            htmlFor='volume-count'
          >
            Volume Count
          </label>
          <input
            type='checkbox'
            id='filter-volCount'
            checked={volumeCountFilter}
            onChange={handleVolumeCountFilter}
          />

          <input
            type='number'
            step={1}
            min={0}
            max={10}
            id='volume-count'
            className='bg-gray-50 w-[70px] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
            value={volumeCount}
            onChange={handleVolumeCount}
          />
        </div>
      </div>
      <div className='flex'>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold mx-2 py-1 px-2 rounded'
          onClick={() => socket.emit('reconnect')}
        >
          Reconnect
        </button>

        <button
          className='bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold mx-2 py-1 px-2 rounded'
          onClick={() => socket.emit('get-data')}
        >
          Refresh
        </button>

        {/* <button
            className='bg-blue-500 hover:bg-blue-700 text-sm text-white font-bold mx-2 py-1 px-2 rounded'
            onClick={() => setVolumeAlerts([])}
          >
            Clear Vol alerts
          </button> */}

        {/* <button
            className='bg-blue-500 hover:bg-blue-700 text-sm text-white font-bold mx-2 py-1 px-2 rounded'
            onClick={() => setVelotaAlerts([])}
          >
            Clear Velota alerts
          </button> */}
        <div className='group mx-5'>
          <label htmlFor='filter-push'>Show push/superpush only</label>
          <input
            type='checkbox'
            id='filter-push'
            checked={pushFilter}
            onChange={handlePushFilter}
          />
        </div>
        <div className='group mx-5'>
          <label htmlFor='filter-overbought'>Show overbought only</label>
          <input
            type='checkbox'
            id='filter-overbought'
            checked={overBoughtFilter}
            onChange={handleOverBoughtFilter}
          />
        </div>
        <div className='group mx-5'>
          <label htmlFor='filter-oversold'>Show oversold only</label>
          <input
            type='checkbox'
            id='filter-oversold'
            checked={overSoldFilter}
            onChange={handleOverSoldFilter}
          />
        </div>
      </div>
      <div className='flex'></div>
      <table className='table-auto min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse border border-blue-500'>
        <thead>
          <tr>
            <th colSpan={2}>Symbol</th>

            <th
              colSpan={6}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              RSI ({rsiSelectedSort})
            </th>
            <th
              colSpan={6}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              candle status
            </th>
          </tr>
          <tr>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              Name
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              Curr.Price
            </th>
            <th
              onClick={() => handleSelectSort('5m')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              5min
            </th>
            <th
              onClick={() => handleSelectSort('15m')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              15min
            </th>
            <th
              onClick={() => handleSelectSort('30m')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              30min
            </th>
            <th
              onClick={() => handleSelectSort('1h')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              1Hra
            </th>
            <th
              onClick={() => handleSelectSort('4h')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              4Hra
            </th>
            <th
              onClick={() => handleSelectSort('1d')}
              className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
            >
              Dia
            </th>
            {/* <th
                onClick={() => handleSelectSort('1w')}
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
              >
                1w
              </th> */}
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              5m
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              15m
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              30m
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1h
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              4h
            </th>
            <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
              1d
            </th>
            {/* <th className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                1w
              </th> */}
          </tr>
        </thead>
        <tbody>
          {dataBTC.length > 0 && (
            <tr key={dataBTC[0].symbol} className='border-2 border-red-500'>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {/* <a
                    href={`https://www.tradingview.com/symbols/${dataBTC[0].symbol}/?exchange=BINANCE`}
                    target='_blank'
                  >
                    {dataBTC[0].symbol}
                  </a> */}
                <a
                  href={`https://www.tradingview.com/chart?symbol=BINANCE:${dataBTC[0].symbol}`}
                  target='_blank'
                >
                  {dataBTC[0].symbol}
                </a>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                {dataBTC[0].price}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi5m)
                }}
              >
                {dataBTC[0].rsi5m}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi15m)
                }}
              >
                {dataBTC[0].rsi15m}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi30m)
                }}
              >
                {dataBTC[0].rsi30m}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi1h)
                }}
              >
                {dataBTC[0].rsi1h}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi4h)
                }}
              >
                {dataBTC[0].rsi4h}
              </td>
              <td
                className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                style={{
                  backgroundColor: getBgColor(dataBTC[0].rsi1d)
                }}
              >
                {dataBTC[0].rsi1d}
              </td>
              {/* <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(dataBTC[0].rsi1w)
                  }}
                >
                  {dataBTC[0].rsi1w}
                </td> */}

              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle5m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '5m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `5m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `5m`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `5m`)}
                  >
                    3
                  </span>
                </div>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle15m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '15m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `15m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `15m`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `15m`)}
                  >
                    3
                  </span>
                </div>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle30m ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '30m')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `30m`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `30m`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `30m`)}
                  >
                    3
                  </span>
                </div>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle1h ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '1h')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `1h`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `1h`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `1h`)}
                  >
                    3
                  </span>
                </div>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle4h ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '4h')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `4h`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `4h`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `4h`)}
                  >
                    3
                  </span>
                </div>
              </td>
              <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                <div className='flex'>
                  <span
                    style={{
                      width: 8,
                      height: 16,
                      backgroundColor: dataBTC[0].isRedCandle1d ? 'red' : 'green'
                    }}
                  ></span>
                  {renderIcons(dataBTC[0], '1d')}
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval1(dataBTC[0].symbol, `1d`)}
                  >
                    1
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval2(dataBTC[0].symbol, `1d`)}
                  >
                    2
                  </span>
                  <span
                    className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                    onClick={() => handleChangeInterval3(dataBTC[0].symbol, `1d`)}
                  >
                    3
                  </span>
                </div>
              </td>
              {/* <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  <div className='flex'>
                    <span
                      style={{
                        width: 8,
                        height: 16,
                        backgroundColor: dataBTC[0].isRedCandle1w ? 'red' : 'green'
                      }}
                    ></span>
                    {renderIcons(dataBTC[0], '1w')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(dataBTC[0].symbol, `1w`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(dataBTC[0].symbol, `1w`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(dataBTC[0].symbol, `1w`)}
                    >
                      3
                    </span>
                  </div>
                </td> */}
            </tr>
          )}

          {dataSymbols.map(coin => {
            return (
              <tr key={coin.symbol}>
                <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  {/* <a
                    href={`https://www.tradingview.com/symbols/${coin.symbol}/?exchange=BINANCE`}
                    target='_blank'
                  >
                    {coin.symbol}
                  </a> */}
                  <a
                    href={`https://www.tradingview.com/chart?symbol=BINANCE:${getTradingViewSymbol(
                      coin.symbol
                    )}`}
                    target='_blank'
                  >
                    {coin.symbol}
                  </a>
                </td>
                <td className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'>
                  {coin.price}
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi5m)
                  }}
                >
                  {coin.rsi5m} ({coin.prev10CandleVolumeCount5m})
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi15m)
                  }}
                >
                  {coin.rsi15m} ({coin.prev10CandleVolumeCount15m})
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi30m)
                  }}
                >
                  {coin.rsi30m} ({coin.prev10CandleVolumeCount30m})
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi1h)
                  }}
                >
                  {coin.rsi1h} ({coin.prev10CandleVolumeCount1h})
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi4h)
                  }}
                >
                  {coin.rsi4h} ({coin.prev10CandleVolumeCount4h})
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: getBgColor(coin.rsi1d)
                  }}
                >
                  {coin.rsi1d} ({coin.prev10CandleVolumeCount1d})
                </td>
                {/* <td
                    className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                    style={{
                      backgroundColor: getBgColor(coin.rsi1w)
                    }}
                  >
                    {coin.rsi1w} ({coin.prev10CandleVolumeCount1w})
                  </td> */}

                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle5m ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '5m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `5m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `5m`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `5m`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle15m ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '15m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `15m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `15m`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `15m`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle30m ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '30m')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `30m`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `30m`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `30m`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle1h ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '1h')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `1h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `1h`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `1h`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle4h ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '4h')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `4h`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `4h`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `4h`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                <td
                  className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                  style={{
                    backgroundColor: coin.isRedCandle1d ? 'red' : 'green'
                  }}
                >
                  <div className='flex'>
                    {renderIcons(coin, '1d')}
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval1(coin.symbol, `1d`)}
                    >
                      1
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval2(coin.symbol, `1d`)}
                    >
                      2
                    </span>
                    <span
                      className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                      onClick={() => handleChangeInterval3(coin.symbol, `1d`)}
                    >
                      3
                    </span>
                  </div>
                </td>
                {/* <td
                    className='border border-blue-500 px-2 py-1 whitespace-nowrap text-sm font-medium'
                    style={{
                      backgroundColor: coin.isRedCandle1w ? 'red' : 'green'
                    }}
                  >
                    <div className='flex'>
                      {renderIcons(coin, '1w')}
                      <span
                        className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                        onClick={() => handleChangeInterval1(coin.symbol, `1w`)}
                      >
                        1
                      </span>
                      <span
                        className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                        onClick={() => handleChangeInterval2(coin.symbol, `1w`)}
                      >
                        2
                      </span>
                      <span
                        className='bg-blue-200 hover:bg-blue-400 text-black text-sm cursor-pointer mx-1 px-1'
                        onClick={() => handleChangeInterval3(coin.symbol, `1w`)}
                      >
                        3
                      </span>
                    </div>
                  </td> */}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={17}>
              <Image className='inline' alt='push' src='/assets/push.png' width={24} height={24} />
              <span>
                PUSH (isPowerCandle) : Cuando entra nueva vela de otro color con mucho volumen
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              <Image
                className='inline'
                alt='superpush'
                src='/assets/superpush.png'
                width={24}
                height={24}
              />
              <span>
                SuperPUSH (isPowerCandle+big) : igual q PUSH pero la vela es mas grande(elefante)
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              <Image className='inline' alt='stop' src='/assets/stop.png' width={24} height={24} />
              <span>
                STOP: Cuando la vela anterior tiene mucho volumen, y aparece nueva vela con otro
                color
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={17}>
              ( n )
              <span>
                n: Cuantas velas con alto volumen (buy or sell) hubieron en las ultimas 10 velas
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const isOverBought = (value: number) => {
  return value > 70
}
const isOverSold = (value: number) => {
  return value < 30
}
const getBgColor = (value: number) => {
  if (isOverBought(value)) return 'green'
  else if (isOverSold(value)) return 'red'
  else return 'transparent'
}

const TRADING_VIEW_SYMBOLS: { [key: string]: string } = {
  '1000SHIBUSDT': 'SHIBUSDT',
  '1000XECUSDT': 'XECUSDT',
  '1000LUNCUSDT': 'LUNCUSDT',
  '1000PEPEUSDT': 'PEPEUSDT',
  '1000FLOKIUSDT': 'FLOKIUSDT'
}

const getTradingViewSymbol = (symbol: string) => {
  return TRADING_VIEW_SYMBOLS[symbol] ?? symbol
}

const getTradingViewInterval = (interval: string) => {
  return (
    { '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 60 * 4, '1d': 'd', '1w': 'w' }[interval] ?? ''
  )
}
