import type { NextApiRequest, NextApiResponse } from 'next'
import type { Server as HTTPServer } from 'http'
import type { Socket as NetSocket } from 'net'
import { Server as IOServer } from 'Socket.IO'
import { unsubscribeAll, getDataToSend, getData } from '@/app/binance'

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

  getData(sendData)

  console.log('Setting up socket')
  io = new IOServer(res.socket.server, {
    path: '/api/socket_io',
    addTrailingSlash: false
  })
  res.socket.server.io = io
  io.on('connection', socket => {
    console.log('Connection established')
    // socket.broadcast.emit('receive-message', { msg: 'hello' })

    sendData()

    socket.on('get-data', () => sendData())

    // socket.on('clients', () => {
    //   io.emit('clients', io.engine.clientsCount)
    // })

    // install a timer to periodically send values

    socket.on('bye', () => {
      unsubscribeAll()
      console.log('subscription cleared')
    })
  })

  res.end()
}

const sendData = () => {
  const dataToSend = getDataToSend()
  console.log('sending data', dataToSend.length)
  io.emit('data', dataToSend)
}
