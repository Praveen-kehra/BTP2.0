import React from 'react'
import axios from 'axios'
import { useState, useRef } from 'react'
import './Filelink.css'

export default function FileLink(props) {
  const fileName = props.fileName
  const userAddress = props.id
  const [data, setdata] = useState('')

  const handleLoad = async () => {
    let startTime = new Date()
    console.log(fileName)
    console.log(userAddress)

    const res = await axios.post('/retrieveFile', {
      id : userAddress,
      name : fileName
    })

    console.log(startTime)

    let endTime = new Date()

    let timeElapsed = endTime - startTime

    console.log('Time taken for file retrieval - ', timeElapsed)

    console.log(res)
    setdata(res.data.message)
  }

  const handleDelete = async () => {
    let startTime = new Date()

    const res = await axios.post('/deleteFile', {
      id: userAddress,
      name : fileName
    })

    let endTime = new Date()

    let timeElapsed = endTime - startTime

    console.log('Time taken for file deletion - ', timeElapsed)

    console.log(res)
    setdata('')
  }

  return (
    <div className="FileLink">
      <div className="fileName">{fileName}</div>
      <button onClick={handleLoad} className="button">Load Data</button>
      <button onClick={handleDelete} className="button">Delete File</button>
      <textarea className="displayFile" value={data}/>
    </div>
  )
}