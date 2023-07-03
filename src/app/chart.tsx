import { ColorType, createChart } from 'lightweight-charts'
import { RefObject, useEffect, useRef } from 'react'

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
        textColor: 'black',
        background: { type: ColorType.Solid, color: 'white' }
      },
      crosshair: {
        mode: 0 // CrosshairMode.Normal
      },
      width: chartContainerRef?.current?.clientWidth ?? 200,
      height: 300
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
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    })

    candlestickSeries
      // .addLineSeries({
      //   color: '#2962FF',
      //   lineWidth: 2,
      // })
      .setData(
        data
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
    chart.timeScale().fitContent()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)

      chart.remove()
    }
  }, [data])

  return <div ref={chartContainerRef} className='w-full' />
}
