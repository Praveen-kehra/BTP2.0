import { queue, addNode, showQueue, removeNode } from './queue.js'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { fileURLToPath } from 'url'
import http from 'http'
import { Server } from 'socket.io'
import bodyParser from 'body-parser'
import sha256 from 'crypto-js/sha256.js'
import CryptoJS from 'crypto-js'
import sizeof from 'object-sizeof'
import Web3 from 'web3'
import Provider from '@truffle/hdwallet-provider'
import fs from 'fs'
import solc from 'solc'

import express from 'express'

import d from 'dotenv'

d.config()

const PORT = process.env.PORT || 3000

var SmartContractAddress = "0x44082c46f2bb3cf529672e53d5c84f852051239e"
var SenderAddress = "0xaCB81a18fb398158ADA9552C9eB9AdB7F51e5e82"
var privateKey = "887838706d2b254cea3cbf322ee00186ddc42665e015c4801fcfd5b21fd09801"
var rpcUrl = "https://sepolia.infura.io/v3/813ec978eaf64d9bb98d557ef7f14ca6"

const file = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./smart-contract/contracts/store.sol")).toString()

var input = {
    language : "Solidity",
    sources : {
        "store.sol" : {
            content : file,
        },
    },
    settings : {
        outputSelection : {
            "*" : {
                "*" : ["*"],
            },
        },
    },
}

var output = JSON.parse(solc.compile(JSON.stringify(input)))
// console.log(output)

const ABI = output.contracts["store.sol"].Project.abi
// console.log(ABI)

//we need to put below code in a function and get which method to execute as argument to the function
//these variables aren't made for prologned existence like socket variable

// const provider = new Provider(privateKey, rpcUrl)
// const web3 = new Web3(provider)
// const myContract = new web3.eth.Contract(ABI, SmartContractAddress)

// console.log(myContract.methods)

async function interactWithContract(methodToCall, ...args) {
    const provider = new Provider(privateKey, rpcUrl)
    const web3 = new Web3(provider)
    const myContract = new web3.eth.Contract(ABI, SmartContractAddress)

    myContract.methods[methodToCall](...args).send({
        from : SenderAddress
    }).then(receipt => {
        console.log('Sent Transaction to Smart Contract')
        console.log(receipt)
    })
}

const app = express()
const server = http.Server(app).listen(PORT, () => {
    console.log('Listening on PORT ' + PORT)
})

const io = new Server(server, {
    maxHttpBufferSize: 5 * 1e8
})

const numChunks = 4
const redundantFactor = 3

app.use(bodyParser.json({ limit : '500mb'}))
app.use(bodyParser.urlencoded({ extended : false, limit : '500mb' }))
app.use(express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/build')))

//clients doesn't need to be on the blockchain
var clients = new Map()

//user is an array of all users
var user = []

//filesName is a map from users to an array of their files(file Names)
var fileNames = new Map();

//filesIds is a map from users to an array of their files(file Ids)
var fileIds = new Map();

//this is a mapping from (userId => (fileName => fileId))
var fileMapping = new Map();

//shards is a map from a file to its shards
var shards = new Map();

//shardLocate is a map from a particular shard to all the nodes its saved on(currently redundantFactor for each shard)
var shardLocate = new Map();

//this stores the hash of every shard
var shardHashes = new Map();

//this stores the size of the data Store generated for every file
var dataStoreSizes = new Map();

//this stores how much data we can store on each user's pc
var maxLimit = new Map();

//this stores how much data we have stored on some user's pc
//from userId to current size of data stored on his computer
var current = new Map();

//only one file distribute query should be run at a time, so as to avoid
//editing of queue data structure by multiple actors
//client Map should remain same while function is running
async function distributeData(userId, dataStore, fileName) {
    //need to generate ids for file and its shards
    // console.log(fileNames)
    const fileId = uuid().slice(0, 20)

    if(fileIds.has(userId) == false) {
        fileIds.set(userId, [])
    }

    if(fileNames.has(userId) == false) {
        fileNames.set(userId, [])
    }

    //if the fileName has already been uploaded by the user, do not process/distribute that file further
    if(fileNames.get(userId).includes(fileName) == true) {
        return false
    }

    if(fileMapping.has(userId) == false) {
        fileMapping.set(userId, new Map())
    }

    fileIds.set(userId, [...fileIds.get(userId), fileId])

    fileNames.set(userId, [...fileNames.get(userId), fileName])

    fileMapping.get(userId).set(fileName, fileId)

    dataStoreSizes.set(fileId, dataStore.length)

    while(dataStore.length > 0) {
        const shardId = uuid().slice(0, 24)

        //find last element of dataStore and delete it
        const shard = dataStore[dataStore.length - 1]
        dataStore.pop()

        shard.id = shardId

        //size in bytes
        let shardSize = sizeof(shard)

        console.log(shardSize)

        if(shards.has(fileId) == false) {
            shards.set(fileId, [])
        }

        shards.set(fileId, [...shards.get(fileId), shardId])

        let hash = sha256(JSON.stringify(shard))

        shardHashes.set(shardId, hash.toString(CryptoJS.enc.Hex))

        console.log(shardHashes.get(shardId))

        let counter = 0

        while(queue.length > 0 && counter < redundantFactor) {
            //removing a node from the end of the queue
            const node = queue[queue.length - 1]
            queue.pop()

            if(parseInt(maxLimit.get(node)) < parseInt(current.get(node)) + shardSize) {
                queue.unshift(node)
                continue
            }

            const nodeSocket = clients.get(node)

            nodeSocket.emit('storeData', JSON.stringify(shard))
            current.set(node, parseInt(parseInt(current.get(node)) + shardSize))

            if(shardLocate.has(shardId) == false) {
                shardLocate.set(shardId, [])
            }

            shardLocate.set(shardId, [...shardLocate.get(shardId), node])

            queue.unshift(node)

            counter++

            await new Promise(r => setTimeout(r, 2000));
        }
    }

    return true
}

app.post("/sendToServer", async (req, res) => {
    //data is in string format req.body.textData
    let dataStore = []
    let data = req.body.textData

    //id of sender
    const id = req.body.id
    const name = req.body.name

    if(!data || !id || !name) {
        console.log("PROBLEM")
        return
    }

    if(user.includes(id) == false) {
        user.push(id);

        // let request = myContract.methods.addUser(id).send({
        //     from : SenderAddress
        // })

        interactWithContract(addUser, id)

        // console.log(request)
        
        //need to set some default value for maxLimit
        //setting it as 500MB
        
        maxLimit.set(id, parseInt(500 * 1024 * 1024))

        current.set(id, parseInt(0))
    }

    // console.log(user)

    let chunkSize = parseInt(Math.floor(data.length / numChunks))

    // console.log(chunkSize)

    let i = 0, counter = 0

    while(true) {
        i = counter * chunkSize

        // console.log(i)

        if(i >= data.length) break;

        let currObject = {
            position : counter,
            store : data.slice(i, i + Math.min(chunkSize, data.length - i))
        }

        // console.log(currObject.store)

        dataStore.push(currObject)
        
        counter++
    }

    const returnVal = distributeData(id, dataStore, name)

    // console.log(returnVal)

    if(returnVal == true) {
        res.json({ message : 'File Stored successfully.'})
    } else {
        res.json({ message : 'Cannot store file with the same name twice.'})
    }

})

var tempDataStore = []

app.post('/retrieveFile', async (req, res) => {

    tempDataStore = []

    const userId = req.body.id
    const fileName = req.body.name

    if(user.includes(userId) == false) {
        res.json({ message : 'Cannot find specified user.'})
        return
    }

    if(fileNames.get(userId).includes(fileName) == false) {
        res.json({ message : 'Cannot find the specified file.'})
        return
    }

    //fileMapping tells us relationship between fileNames and fileIds for every userId
    const fileId = fileMapping.get(userId).get(fileName)

    for(const shardId of shards.get(fileId)) {
        // console.log(shardId)

        for(const nodeId of shardLocate.get(shardId)) {
            //could put sleep here to solve the problem

            // console.log("Ran")
            if(clients.has(nodeId) == true) {
                const nodeSocket = clients.get(nodeId)
                const callback = uuid().slice(0, 50)

                nodeSocket.on(callback, (data) => {
                    //checking hashes of shards to maintain integrity of the file
                    const hash = sha256(JSON.stringify(data)).toString(CryptoJS.enc.Hex)

                    console.log('callback being called', data)

                    let exists = false

                    for(let value of tempDataStore) {
                        if(value.position === data.position) {
                            exists = true
                            break
                        }
                    }

                    if(hash == shardHashes.get(shardId) && exists == false) {
                        tempDataStore.push(data)

                        console.log(tempDataStore)

                        if(tempDataStore.length == dataStoreSizes.get(fileId)) {
                            console.log('got it')
                            //sort the tempDataStore first
                            tempDataStore.sort((first, second) => {
                                let a = parseInt(first.position)
                                let b = parseInt(second.position)

                                if(a < b) return -1;
                                else if(a == b) return 0;
                                else return 1;
                            })

                            let data = ''

                            for(const obj of tempDataStore) {
                                data += obj.store
                            }

                            res.json({ message : data })
                        }
                    } else if(hash != shardHashes.get(shardId)) {
                        //code for telling nodeSocket to delete the shard as it is corrupt
                        console.log('corrupt hash')
                    }
                })

                nodeSocket.emit('serverRequestData', { id : shardId, callback : callback })

                // await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
})

app.post("/userFiles", async (req, res) => {
    const userId = req.body.userId
    let m = fileMapping.get(userId)
    let f = fileNames.get(userId)
    return res.json({
        files: (f ? f : []),
        mapping : Object.fromEntries(m ? m : new Map())
    }
    );
})

app.post("/deleteFile", async (req, res) => {
    console.log('In delete File')

    const { id: userId, name: fileName } = req.body

    console.log(fileNames.get(userId))

    //later will also need to include code to ensure that all users having associated file shards
    //delete those shards
    //can skip that for now

    //checking if user is actually in the user array
    if(user.includes(userId) == true) {
        const fileId = fileMapping.get(userId).get(fileName)

        //checking if file actually exists in fileMapping
        if(fileId) {
            let index = fileNames.get(userId).indexOf(fileName)

            //only delete if fileName is found
            if(index > -1) {
                let arr = fileNames.get(userId)
                arr.splice(index, 1)
                fileNames.set(userId, arr)
            }

            index = fileIds.get(userId).indexOf(fileId)

            //only delete if fileId is found
            if(index > -1) {
                let arr = fileIds.get(userId)
                arr.splice(index, 1)
                fileIds.set(userId, arr)
            }

            fileMapping.get(userId).delete(fileName)
        }
    }

    console.log(fileNames.get(userId))

    res.json({
        message : 'File successfully deleted from the network'
    })
})

app.post("/changeMaxLimit", (req, res) => {
    //size is in bytes
    const {id : userId, new: newLimit} = req

    console.log(newLimit)

    maxLimit.set(userId, parseInt(newLimit))
})

app.get("*", (req, res) => {
    res.sendFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/build', 'index.html'))
})

io.on('connection', (socket) => {
    console.log('A user connected')

    socket.on('id', (data) => {
        const obj = JSON.parse(data)

        clients.set(obj.content, socket)
        addNode(queue, obj.content)

        console.log('id received ' + obj.content)
    })

    socket.on('beforeConnectionClose', (data) => {
        const obj = JSON.parse(data)

        clients.delete(obj.content)
        removeNode(queue, obj.content)
    })

    socket.on('disconnect', () => {
        console.log('Client has Disconnected')
    })
})