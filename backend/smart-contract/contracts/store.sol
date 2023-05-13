pragma solidity ^0.8.0;

contract Project {
    mapping (string => bool) user;
    mapping (string => string[]) fileNames;
    mapping (string => string[]) fileIds;

    //used as value for fileMapping with userId as key
    struct UserData {
        mapping(string => string) fileNameToFileId;
    }

    mapping(string => UserData) fileMapping;

    mapping(string => string[]) shards;

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
}