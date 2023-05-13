import React, { useState, useRef } from 'react'
import FileLink from '../fileLink/FileLink';
import axios from 'axios';

export default function UserFiles(props) {
  const userAddress = props.userAddress
  const [files, setFiles] = useState([]);
  const [mapping, setMapping] = useState([]);

  const getFiles = async () => {
      const res = await axios.post("/userFiles", {userId: userAddress});
      console.log(res)
      setFiles(res.data.files)
      setMapping(res.data.mapping)
  }

  return (
    <div className="userfile-container">
      <p>UserFiles</p>
        <button onClick={getFiles}>Reload</button>
        <ul>
          {files.map((f) => {
            console.log(mapping[f])
            return <FileLink fileName={f} id={userAddress} key={mapping[f]}/>
          }
          )}
        </ul>
    </div>
  )
}