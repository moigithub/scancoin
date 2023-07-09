import { ColorType, createChart } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'

export const Chart = ({
  data = [],
  ema20 = false,
  sma50 = false,
  sma200 = false,
  width = 200,
  height = 150
}: {
  data: any[]
  width?: number
  height?: number
  ema20?: boolean
  sma50?: boolean
  sma200?: boolean
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [fitContent, setFitContent] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef?.current?.clientWidth })
    }

    const chart = createChart(chartContainerRef?.current!, {
      rightPriceScale: {
        visible: true
      },
      leftPriceScale: {
        visible: true
      },
      layout: {
        textColor: 'white',
        background: { type: ColorType.Solid, color: '#222222' }
      },
      crosshair: {
        mode: 0 // CrosshairMode.Normal
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: true, color: '#D6DCDE55' }
      },
      width: chartContainerRef?.current?.clientWidth ?? width,
      height
    })

    /*
    // Convert the candlestick data for use with a line series
const lineData = candleStickData.map(datapoint => ({
  time: datapoint.time,
  value: (datapoint.close + datapoint.open) / 2,
}));

// Add an area series to the chart,
// Adding this before we add the candlestick chart
// so that it will appear beneath the candlesticks
const areaSeries = chart.addAreaSeries({
  lastValueVisible: false, // hide the last value marker for this series
  crosshairMarkerVisible: false, // hide the crosshair marker for this series
  lineColor: 'transparent', // hide the line
  topColor: 'rgba(56, 33, 110,0.6)',
  bottomColor: 'rgba(56, 33, 110, 0.1)',
});
// Set the data for the Area Series
areaSeries.setData(lineData);
*/

    if (ema20) {
      // { time: { year: 2018, month: 1, day: 1 }, value: 27.58405298746434 },
      const formattedEma20 = data
        .filter(d => d.ema20 !== undefined)
        .map(d => ({ time: d.time, value: d.ema20 }))
      // console.log('formatted ema', formattedEma20)
      const ema20Series = chart.addLineSeries({
        color: '#FFFFFF',
        lineWidth: 2,
        // disabling built-in price lines
        lastValueVisible: false,
        priceLineVisible: false
      })
      ema20Series.setData(formattedEma20)
    }

    if (sma50) {
      const formattedSma50 = data
        .filter(d => d.sma50 !== undefined)
        .map(d => ({ time: d.time, value: d.sma50 }))
      // console.log('formatted sma50', formattedSma50)
      const sma50Series = chart.addLineSeries({
        color: '#FFEA00',
        lineWidth: 2,
        // disabling built-in price lines
        lastValueVisible: false,
        priceLineVisible: false
      })
      sma50Series.setData(formattedSma50)
    }

    if (sma200) {
      const formattedSma200 = data
        .filter(d => d.sma200 !== undefined)
        .map(d => ({ time: d.time, value: d.sma200 }))
      // console.log('formatted sma200', formattedSma200)
      const sma200Series = chart.addLineSeries({
        color: '#FF0000',
        lineWidth: 2,
        // disabling built-in price lines
        lastValueVisible: false,
        priceLineVisible: false
      })
      sma200Series.setData(formattedSma200)
    }

    const candlestickSeries = chart.addCandlestickSeries({
      priceScaleId: 'right',
      upColor: '#00AA00',
      downColor: 'red',
      borderVisible: false,
      wickUpColor: '#00AA00',
      wickDownColor: 'red'
    })

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
      candlestickSeries
        // .addLineSeries({
        //   color: '#2962FF',
        //   lineWidth: 2,
        // })
        .setData(
          candleStickData
          //   [
          //   {
          //     close: 108.9974612905403,
          //     high: 121.20998259466148,
          //     low: 96.65376292551082,
          //     open: 104.5614412226746,
          //     time: { year: 2018, month: 9, day: 22 }
          //   }
          // ]
        )
    }

    candlestickSeries.priceScale().applyOptions({
      autoScale: false, // disables auto scaling based on visible content
      scaleMargins: {
        top: 0.1,
        bottom: 0.2
      }
    })

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

    if (fitContent) {
      chart.timeScale().fitContent()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // chart.timeScale().unsubscribeVisibleLogicalRangeChange(changeRange)
      // chart.timeScale().unsubscribeVisibleTimeRangeChange(changeTime)

      chart.remove()
    }
  }, [data])

  return (
    <div className='chart-container w-full'>
      <div ref={chartContainerRef} className='w-full' />
      <label>Adjust content</label>
      <input type='checkbox' checked={fitContent} onChange={e => setFitContent(e.target.checked)} />
    </div>
  )
}

// helpers
