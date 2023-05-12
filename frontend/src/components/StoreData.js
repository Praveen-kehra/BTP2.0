import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import io from 'socket.io-client'
import UploadData from './UploadData/UploadData';
import axios from 'axios'
import UserFiles from './userfiles/UserFiles';
import Web3 from 'web3';

const id = uuid().slice(0, 16);

const web3 = new Web3(window.ethereum)

const StoreData = () => {
    const socketRef = useRef(null)
    const folderHandle = useRef(null)
    const [userId, setUserId] = useState(null)

    const onClickHandler = async () => {
        folderHandle.current = await window.showDirectoryPicker({ mode : 'readwrite' })
        console.log(folderHandle)
    }

    const retrieveFile = async () => {
        const res = await axios.post('/retrieveFile', {
            id : id,
            name : 'test_file_1.txt'
        })

        console.log(res)
    }

    useEffect(() => {
        const eth = window.ethereum;
        const temp = async () => {
            try {
                const accounts = await eth.request({
                    method : 'eth_requestAccounts'
                })
                if(accounts && accounts[0]) {
                    console.log(accounts[0])
                    setUserId(accounts[0])
                }
            } catch(err) {
                console.log(err)
            }
        }
        temp()
    }, [])

    useEffect(() => {
        if(userId != null) {
            console.log("first")
            // socketRef.current = io.connect("https://my-app-a0p5.onrender.com:10000")
            // socketRef.current = io.connect(`http://127.0.0.1:8081`)
            socketRef.current = io.connect()

            console.log("second")
            console.log(socketRef.current)

            socketRef.current.on('connect', () => {
                console.log('Connected to the Server')

                setTimeout(() => {
                    socketRef.current.emit('id', JSON.stringify({
                        content : userId
                    }))
                }, 1000)
            })

            socketRef.current.on('storeData', async (data) => {
                const shard = JSON.parse(data)

                console.log('Message from server received')
                console.log(shard)

                if(folderHandle != null) {
                    console.log(folderHandle.current)
                    const newFileHandle = await folderHandle.current.getFileHandle(shard.id, { create : true })

                    const writable = await newFileHandle.createWritable()

                    await writable.write(JSON.stringify(shard))

                    await writable.close()
                } else console.log('Please Grant The Necessary Permissions.')
            })

            socketRef.current.on('serverRequestData', async (data) => {
                const shardId = data.id
                const callback = data.callback

                if(folderHandle != null) {
                    try {
                        let fileHandle = await folderHandle.current.getFileHandle(shardId, { create : false })
                        console.log(fileHandle)
                        const file = await fileHandle.getFile()
                        const contents = await file.text()
                        
                        socketRef.current.emit(callback, JSON.parse(contents))
                    } catch(err) {
                        console.log(err.message)
                    }
                } else console.log('Please Grant The Necessary Permissions.')
            })

            socketRef.current.on('disconnect', () => {
                console.log('Disconnectd from Socket Server')
            })

            window.addEventListener('beforeunload', (event) => {
                socketRef.current.emit('beforeConnectionClose', JSON.stringify({
                    content: userId
            }))

                socketRef.current.disconnect()
            })
        }
    }, [userId]);

    return (
        <div className="StoreData">
            <UploadData id={userId} />
            <button onClick = {onClickHandler}>Grant Permissions</button>
            {/* <button onClick = {retrieveFile}>Retrieve File</button> */}
            <UserFiles userAddress={userId} />
        </div>
    )
}

export default StoreData;