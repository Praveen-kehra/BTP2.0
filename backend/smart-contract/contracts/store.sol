pragma solidity ^0.8.0;

contract Project {
    address payable public owner;

    mapping (string => bool) user;
    mapping (string => string[]) fileNames;
    mapping (string => string[]) fileIds;

    //used as value for fileMapping with userId as key
    struct UserData {
        mapping(string => string) fileNameToFileId;
    }

    mapping(string => UserData) fileMapping;

    mapping(string => string[]) shards;

    mapping(string => string[]) shardLocate;

    mapping(string => string) shardHashes;

    mapping(string => uint256) dataStoreSizes;

    mapping(string => uint256) maxLimit;

    mapping(string => uint256) current;

    constructor() {
        owner = payable(msg.sender);
    }

    receive() external payable {
        bool success = owner.send(msg.value);
        require(success == true, "Transactions to owner failed.");
    }

    function getContractBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function addUser(string memory User) public {
        user[User] = true;
    }

    function checkUserExists(string memory User) public view returns(bool) {
        if(user[User] == true) return true;
        else return false;
    }
    
    function addFileName(string memory User, string memory FileName) public {
        fileNames[User].push(FileName);
    }

    function viewFileName(string memory User) public view returns(string[] memory) {
        return fileNames[User];
    }

    function addFileId(string memory User, string memory FileId) public {
        fileIds[User].push(FileId);
    }

    function viewFileIds(string memory User) public view returns(string[] memory) {
        return fileIds[User];
    }

    function addFilesToUserInFileMapping(string memory User, string memory FileName, string memory FileId) public {
        fileMapping[User].fileNameToFileId[FileName] = FileId;
    }

    function viewFileMapping(string memory User, string memory FileName) public view returns(string memory) {
        return fileMapping[User].fileNameToFileId[FileName];
    }

    function viewShards(string memory fileId) public view returns(string[] memory) {
        return shards[fileId];
    }

    function addShard(string memory fileId, string memory shardId) public {
        shards[fileId].push(shardId);
    }

    function viewShardLocate(string memory shardId) public view returns(string[] memory) {
        return shardLocate[shardId];
    }

    function addShardLocate(string memory shardId, string memory nodeId) public {
        shardLocate[shardId].push(nodeId);
    }

    function viewShardHash(string memory shardId) public view returns(string memory) {
        return shardHashes[shardId];
    }

    function addShardHash(string memory shardId, string memory HASH) public {
        shardHashes[shardId] = HASH;
    }

    function viewDataStoreSize(string memory fileId) public view returns(uint256) {
        return dataStoreSizes[fileId];
    }

    function setDataStoreSize(string memory fileId, uint256 size) public {
        dataStoreSizes[fileId] = size;
    }

    function viewMaxLimit(string memory userId) public view returns(uint256) {
        return maxLimit[userId];
    }

    function setMaxLimit(string memory userId, uint256 limit) public {
        maxLimit[userId] = limit;   
    }

    function viewCurrent(string memory userId) public view returns(uint256) {
        return current[userId];
    }

    function setCurrent(string memory userId, uint256 c) public {
        current[userId] = c;
    }
}