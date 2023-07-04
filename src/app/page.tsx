import { Symbols } from './symbols'

export default async function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center'>
      {/* pass server component as prop to child component */}
      <Symbols />

      <h3>ideas x hacer</h3>
      <p>inputs:</p>
      <p>-filtro de temporalidad </p>
      <p>-rsi overbought (client) </p>
      <p>-rsi oversold (client) </p>
      <p>-rsi length</p>
      <p>volume factor </p>
      <p>
        volume length (el mismo del rsi) -- esto sirve pa sacar un promedio de volumen de las n
        velas anteriores{' '}
      </p>
      <p>
        indicador de rebote vela elefante con mecha grande (input % de mecha con respecto al cuerpo
        ejm 40%)
      </p>
    </main>
  )
}
