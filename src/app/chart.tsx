import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  MouseEventParams,
  TimeRange,
  createChart
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'

export const Chart = ({
  data = [],
  book = {},
  ema20 = false,
  sma50 = false,
  sma200 = false,
  vwap = false,
  width = 200,
  height = 150,
  backgroundColor = '#222222',
  useAutoFit = false,
  symbol = 'BTCUSDT'
}: {
  data: any[]
  book?: any
  width?: number
  height?: number
  ema20?: boolean
  sma50?: boolean
  sma200?: boolean
  vwap?: boolean
  backgroundColor?: string
  useAutoFit?: boolean
  symbol?: string
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [fitContent, setFitContent] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [bidPriceLines, setBidPriceLines] = useState<any[]>([])
  const [askPriceLines, setAskPriceLines] = useState<any[]>([])

  const [hover, setHover] = useState<MouseEventParams>()
  const ema20Series = useRef<ISeriesApi<'Line'>>()
  const sma50Series = useRef<ISeriesApi<'Line'>>()
  const sma200Series = useRef<ISeriesApi<'Line'>>()
  const vwapSeries = useRef<ISeriesApi<'Line'>>()
  const candlestickSeries = useRef<ISeriesApi<'Candlestick'>>()
  const orderBookAskSeries = useRef<ISeriesApi<'Line'>>()
  const orderBookBidSeries = useRef<ISeriesApi<'Line'>>()
  const chartRef = useRef<IChartApi>()

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef?.current?.clientWidth })
    }

    setCurrentSymbol(symbol) // creo q no es necesario

    chartRef.current = createChart(chartContainerRef?.current!, {
      rightPriceScale: {
        visible: true,
        borderColor: '#485c7b'
        // scaleMargins: {
        //   top: 0.4,
        //   bottom: 0.4
        // }
      },
      leftPriceScale: {
        visible: true
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true
      },
      layout: {
        textColor: 'white',
        background: { type: ColorType.Solid, color: backgroundColor }
      },
      crosshair: {
        mode: CrosshairMode.Normal
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: true, color: '#D6DCDE55' }
      },
      width: chartContainerRef?.current?.clientWidth ?? width,
      height
    })

    ema20Series.current = chartRef.current.addLineSeries({
      color: '#FFFFFF',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })

    sma50Series.current = chartRef.current.addLineSeries({
      color: '#FFEA00',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })
    sma200Series.current = chartRef.current.addLineSeries({
      color: '#FF0000',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })
    vwapSeries.current = chartRef.current.addLineSeries({
      color: '#00FF00',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })
    candlestickSeries.current = chartRef.current.addCandlestickSeries({
      priceScaleId: 'right',
      upColor: '#00AA00',
      downColor: 'red',
      borderVisible: false,
      wickUpColor: '#00AA00',
      wickDownColor: 'red'
    })

    orderBookAskSeries.current = chartRef.current.addLineSeries({
      color: '#FF0000',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })
    orderBookBidSeries.current = chartRef.current.addLineSeries({
      color: '#00FF00',
      lineWidth: 2,
      // disabling built-in price lines
      lastValueVisible: false,
      priceLineVisible: false
    })
    // candlestickSeries.priceScale().applyOptions({
    //   autoScale: false, // disables auto scaling based on visible content
    //   scaleMargins: {
    //     top: 0.1,
    //     bottom: 0.2
    //   }
    // })

    // const changeTime=(range: TimeRange | null) => {
    //   if (!range) return
    //   console.log('timerange', range)
    //   chart.timeScale().applyOptions({
    //     rightOffset: chart.timeScale().scrollPosition()
    //   })
    // }
    // chart.timeScale().subscribeVisibleTimeRangeChange(changeTime)

    // const changeRange = (range: any) => {
    //   console.log('loical range', range)
    //   // const bars =candlestickSeries.barsInLogicalRange(range)
    //   if (!range) return
    //   chart.timeScale().setVisibleLogicalRange({
    //     from: range?.from,
    //     to: range?.to
    //   })
    // }
    // chart.timeScale().subscribeVisibleLogicalRangeChange(changeRange)

    //     const visibleLogicalRange = chart.timeScale().getVisibleLogicalRange();
    // const currentBarSpacing = chart.timeScale().width() / (visibleLogicalRange.to - visibleLogicalRange.from);

    // // change the current barSpacing
    // chart.timeScale().applyOptions({
    //   barSpacing: 12, // default is 6
    // })

    // chart.subscribeCrosshairMove((param) => {
    //   setHover(param); // seems to work without this line
    // });

    const range = chartRef.current.timeScale().getVisibleLogicalRange()
    if (range) {
      console.log('range', range)
      chartRef.current
        .timeScale()
        .setVisibleLogicalRange({ from: range.from, to: Date.now() / 1000 })
    }

    // chartRef.current.timeScale().applyOptions({ shiftVisibleRangeOnNewBar: true })

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
      if (logicalRange) {
        setUserScrolled(true)
      }
      //   const range: Range<number> = {
      //     from: logicalRange?.from ?? 0,
      //     to: logicalRange?.to ?? Date.now() / 1000
      //   }
      //   const bars = candlestickSeries.barsInLogicalRange(range)

      //   if (bars === null) {
      //     return
      //   }
      //   console.log('logicalrange bars', bars)
      //   chart.timeScale().setVisibleLogicalRange({ from: range.from, to: range.to })

      //   // const from = Math.min(bars.from, Math.round(bars.from - timeBucketWidth * 60 * Math.abs(bars.barsBefore)));
      //   // const to = Math.max(bars.to, Math.round(bars.to + timeBucketWidth * 60 * Math.abs(bars.barsAfter)));

      //   // console.log({
      //   //   from,
      //   //   to,
      //   // });
    })

    // chart.timeScale().getVisiblePriceRange()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // chart.timeScale().unsubscribeVisibleLogicalRangeChange(changeRange)
      // chart.timeScale().unsubscribeVisibleTimeRangeChange(changeTime)

      chartRef.current?.remove()
    }
  }, [symbol])

  useEffect(() => {
    if (chartRef.current) {
      if (ema20) {
        // { time: { year: 2018, month: 1, day: 1 }, value: 27.58405298746434 },
        const formattedEma20 = data
          .filter(d => d.ema20 !== undefined)
          .map(d => ({ time: d.time, value: d.ema20 }))
        // console.log('formatted ema', formattedEma20)

        ema20Series.current?.setData(formattedEma20)
      }

      if (sma50) {
        const formattedSma50 = data
          .filter(d => d.sma50 !== undefined)
          .map(d => ({ time: d.time, value: d.sma50 }))
        // console.log('formatted sma50', formattedSma50)

        sma50Series.current?.setData(formattedSma50)
      }

      if (sma200) {
        const formattedSma200 = data
          .filter(d => d.sma200 !== undefined)
          .map(d => ({ time: d.time, value: d.sma200 }))
        // console.log('formatted sma200', formattedSma200)

        sma200Series.current?.setData(formattedSma200)
      }

      if (vwap) {
        const formattedVwap = data
          .filter(d => d.vwap !== undefined)
          .map(d => ({ time: d.time, value: d.vwap }))
        // console.log('formatted vwap', formattedVwap)

        vwapSeries.current?.setData(formattedVwap)
      }

      // inicio orderbook
      // const orderBookAsks = book.asks?.map((d: any) => ({
      //   time: Date.now(),
      //   open: +d.price,
      //   high: +d.price,
      //   low: +d.price,
      //   close: +d.price,
      //   volume: +d.quantity
      // }))

      // const orderBookBids = book.bids?.map((d: any) => ({
      //   time: Date.now(),
      //   open: +d.price,
      //   high: +d.price,
      //   low: +d.price,
      //   close: +d.price,
      //   volume: +d.quantity
      // }))
      //no puedo usar candlesticks xq la data requiere fechas(time) progresivas ascendentes
      // if (orderBookAsks) orderBookAskSeries.current?.setData(orderBookAsks)

      // if (orderBookBids) orderBookBidSeries.current?.setData(orderBookBids)

      const formattedLineData = data.map(d => ({ time: d.time, value: d.close }))
      // console.log('formatted vwap', formattedVwap)

      orderBookAskSeries.current?.setData(formattedLineData)
      orderBookBidSeries.current?.setData(formattedLineData)

      if (askPriceLines.length > 0)
        askPriceLines.forEach(priceLine => orderBookAskSeries.current?.removePriceLine(priceLine))

      if (book.asks) {
        setAskPriceLines(
          book.asks
            ?.map((v: any) => ({ price: +v.price, quantity: +v.quantity }))
            .sort((a: any, b: any) => b.quantity - a.quantity)
            .slice(0, 20)
            .map((d: any) => {
              // console.log('line at', d.price)
              return orderBookAskSeries.current?.createPriceLine({
                price: d.price,
                color: '#AA000040',
                axisLabelColor: '#AA000040',
                axisLabelTextColor: 'white',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                //axisLabelVisible: true
                title: d.quantity
              })
            })
        )
      }

      if (bidPriceLines.length > 0)
        bidPriceLines.forEach(priceLine => orderBookBidSeries.current?.removePriceLine(priceLine))

      if (book.bids) {
        setBidPriceLines(
          book.bids
            ?.map((v: any) => ({ price: +v.price, quantity: +v.quantity }))
            .sort((a: any, b: any) => b.quantity - a.quantity)
            .slice(0, 20)
            .map((d: any) => {
              // console.log('line at', d.price)
              return orderBookBidSeries.current?.createPriceLine({
                price: d.price,
                color: '#00AA0040',
                axisLabelColor: '#00AA0040',
                axisLabelTextColor: 'white',
                lineWidth: 2,
                lineStyle: LineStyle.Dotted,
                //axisLabelVisible: true
                title: d.quantity
              })
            })
        )
      }
      //---- fin orderbook

      // Generate sample data to use within a candlestick series
      const candleStickData = data.map(datapoint => {
        // map function is changing the color for the individual
        // candlestick points that close above 205
        const isRed = datapoint.open > datapoint.close
        const isGreen = datapoint.open < datapoint.close
        if (isRed) {
          if (datapoint.volume < datapoint.volAverage * 0.5) {
            return { ...datapoint, color: '#ef5350', wickColor: '#ef5350' }
          } else if (
            datapoint.volume >= datapoint.volAverage * 0.5 &&
            datapoint.volume < datapoint.volAverage * 1.5
          ) {
            return { ...datapoint, color: 'red', wickColor: 'red' }
          } else {
            return { ...datapoint, color: 'maroon', wickColor: 'maroon' }
          }
        }
        if (isGreen) {
          if (datapoint.volume < datapoint.volAverage * 0.5) {
            return { ...datapoint, color: '#44ff44', wickColor: '#44ff44' }
          } else if (
            datapoint.volume >= datapoint.volAverage * 0.5 &&
            datapoint.volume < datapoint.volAverage * 1.5
          ) {
            return { ...datapoint, color: '#00AA00', wickColor: '#00AA00' }
          } else {
            return { ...datapoint, color: '#004411', wickColor: '#004411' }
          }
        }

        return datapoint
      })

      if (candleStickData.length > 0) {
        candlestickSeries.current?.setData(candleStickData)
      }

      if (useAutoFit && fitContent) {
        chartRef.current.timeScale().fitContent()
      } else {
        if (!userScrolled) {
          const candles = data.slice(-30)

          if (chartRef.current.timeScale().getVisibleLogicalRange()) {
            chartRef.current
              .timeScale()
              .setVisibleRange({ from: candles[0].time, to: Date.now() } as TimeRange)
          }
        }
      }
    }
  }, [data])

  return (
    <div className='chart-container w-full'>
      <div ref={chartContainerRef} className='w-full' />
      {useAutoFit && (
        <>
          <label>Adjust content</label>
          <input
            type='checkbox'
            checked={fitContent}
            onChange={e => setFitContent(e.target.checked)}
          />
        </>
      )}
      {!useAutoFit && (
        <button
          className='bg-blue-200 hover:bg-blue-400 text-black text-xs cursor-pointer mx-0.5 px-1'
          onClick={() => chartRef.current?.timeScale().fitContent()}
        >
          Adjust content
        </button>
      )}
    </div>
  )
}

// helpers
