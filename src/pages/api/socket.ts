import type { NextApiRequest, NextApiResponse } from 'next'
import type { Server as HTTPServer } from 'http'
import type { Socket as NetSocket } from 'net'
import { Server as IOServer } from 'Socket.IO'
import {
  unsubscribeAll,
  initializeCandles,
  pingTime,
  installSockets,
  refreshData,
  setMinRSI,
  setMaxRSI,
  setRSILength,
  setVolumeLength,
  setVolumeFactor,
  setBBCandlePercentOut
} from '@/app/binance'

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

let io: IOServer

export default async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Already set up')
    res.end()
    return
  }

  initializeCandles()

  console.log('Setting up socket')
  io = new IOServer(res.socket.server, {
    path: '/api/socket_io',
    addTrailingSlash: false
  })
  res.socket.server.io = io
  io.on('connection', socket => {
    console.log('Connection established')
    // socket.broadcast.emit('receive-message', { msg: 'hello' })

    socket.on('get-data', refreshData) //refresh btn
    socket.on('reconnect', installSockets) //refresh btn

    socket.on('ping', ping)

    socket.on('setBBCandlePercentOut', (value: number) => {
      console.log('setting BB candle percent outside', value, typeof value)
      setBBCandlePercentOut(value)
    })

    socket.on('setMinRSI', (value: number) => {
      console.log('setting min rsi', value, typeof value)
      setMinRSI(value)
    })

    socket.on('setMaxRSI', (value: number) => {
      console.log('setting max rsi', value, typeof value)
      setMaxRSI(value)
    })

    socket.on('setRSILength', (value: number) => {
      console.log('setting max rsi', value, typeof value)
      setRSILength(value)
    })

    socket.on('setVolumeLength', (value: number) => {
      console.log('setting max rsi', value, typeof value)
      setVolumeLength(value)
    })

    socket.on('setVolumeFactor', (value: number) => {
      console.log('setting max rsi', value, typeof value)
      setVolumeFactor(value)
    })

    socket.on('bye', () => {
      unsubscribeAll()
      console.log('subscription cleared')
    })
  })

  res.end()
}

export const sendData = (dataToSend: any) => {
  // console.log('sending data', dataToSend.length)
  io.emit('data', dataToSend)
}
export const sendAlert = (type: string, data: any) => {
  console.log('sending alert', type, data)
  io.emit(type, data)
}
const ping = async () => {
  const response = await pingTime()
  console.log('ping', response)
  io.emit('pong', response)
}
