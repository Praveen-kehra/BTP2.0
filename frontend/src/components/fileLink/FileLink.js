import React from 'react'
import axios from 'axios'
import { useState, useRef } from 'react'

export default function FileLink(props) {
  const fileName = props.fileName
  const userAddress = props.id
  const [data, setdata] = useState('')

  const handleLoad = async () => {
    const res = await axios.post('/retrieveFile', {
      id : userAddress,
      name : fileName
    })

    console.log(res)
    setdata(res.data.message)
  }

  return (
    <div className="FileLink">
      <div>{fileName}</div>
      <button onClick={handleLoad}>Load Data</button>
      <textarea value={data}/>
    </div>
  )
}