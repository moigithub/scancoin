import { ColorType, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export const Chart = ({ data }: { data: any[] }) => {
  const chartContainerRef = useRef<HTMLDivElement>()

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
      width: chartContainerRef?.current?.clientWidth ?? 200,
      height: 150
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

    const candlestickSeries = chart.addCandlestickSeries({
      priceScaleId: 'right',
      upColor: '#009600',
      downColor: 'red',
      borderVisible: false,
      wickUpColor: '#009600',
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
          return { ...datapoint, color: '#00ff00', wickColor: '#00ff00' }
        } else if (
          datapoint.volume >= datapoint.volAverage * 0.5 &&
          datapoint.volume < datapoint.volAverage * 1.5
        ) {
          return { ...datapoint, color: '#009600', wickColor: '#009600' }
        } else {
          return { ...datapoint, color: '#003200', wickColor: '#003200' }
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
    chart.timeScale().fitContent()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)

      chart.remove()
    }
  }, [data])

  return <div ref={chartContainerRef} className='w-full' />
}
