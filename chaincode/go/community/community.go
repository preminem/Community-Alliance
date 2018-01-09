//
package main
 
import (
    "bytes"
    "encoding/json"
    "fmt"
    "strconv"
    "strings"
    "net/http"
    "io/ioutil"
    "crypto/x509"
    "encoding/pem"
     
    "github.com/hyperledger/fabric/core/chaincode/shim"
    sc "github.com/hyperledger/fabric/protos/peer"
)
 
type SmartContract struct {
}
 
type Post struct {
    Id   string `json:"id"`
    OriginalWebsite  string `json:"originalwebsite"`
    OriginalID string `json:"originalid"`
    Title  string `json:"title"`
    Content  string `json:"content"`
    AuthorId  string `json:"authorid"`
    PublishTime  string `json:"publishtime"`
    UpdateTime  string `json:"updatetime"`
    Category  string `json:"category"`
    SourceId  string `json:"sourceid"`
    Labels  string `json:"labels"`
    Follower_num  int `json:"follower_num"`
    Browse_num  int `json:"browse_num"`
    Star_num  int `json:"star_num"`
    UserName  string `json:"username"`
}
 
type PostLength struct {
    Length int `json:"length"`
}
 
 
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
    return shim.Success(nil)
}
 
 
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {
     
    function, args := APIstub.GetFunctionAndParameters()
     
    if function == "queryPost" {
        return s.queryPost(APIstub, args)
    } else if function == "initLedger" {
        return s.initLedger(APIstub)
    }  else if function == "addPost" {
        return s.addPost(APIstub, args)
    } else if function == "updatePost" {
        return s.updatePost(APIstub, args)
    } else if function == "richQueryPosts" {
        return s.richQueryPosts(APIstub, args)
    } else if function == "getPostNum" {
        return s.getPostNum(APIstub, args)
    } else if function == "deletePost" {
        return s.deletePost(APIstub, args)
    }
    return shim.Error("Invalid Smart Contract function name.")
}
 
func (s *SmartContract) queryPost(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
 
    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting 1")
    }
    postAsBytes, _ := APIstub.GetState(args[0])
    return shim.Success(postAsBytes)
}

func (s *SmartContract) deletePost(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
 
    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting 1")
    }
    err := APIstub.DelState(args[0])
    if err != nil {
    return shim.Error("Failed to delete post from DB, key is: "+args[0])
    }
    return shim.Success(nil)
}



func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) sc.Response {
    creatorByte,_:= APIstub.GetCreator()
   certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
   if certStart == -1 {
      return shim.Error("No certificate found")
   }
   certText := creatorByte[certStart:]
   bl, _ := pem.Decode(certText)
   if bl == nil {
      return shim.Error("Could not decode the PEM structure")
   }

   cert, err := x509.ParseCertificate(bl.Bytes)
   if err != nil {
      return shim.Error("ParseCertificate failed")
   }
   uname:=cert.Subject.CommonName

    posts := []Post{
        Post{Id: "1", OriginalWebsite: "b", OriginalID: "c", Title: "如何学习人工智能呢？",Content:"好好学习",AuthorId:"f",PublishTime:"g",UpdateTime:"h",Category:"i",SourceId:"j",Labels:"k",Follower_num:100,Browse_num:200,Star_num:300,UserName:uname},
        Post{Id: "2", OriginalWebsite: "bb", OriginalID: "bb", Title: "目前大数据有什么用呢？",Content:"没用",AuthorId:"ff",PublishTime:"gg",UpdateTime:"hh",Category:"ii",SourceId:"jj",Labels:"kk",Follower_num:400,Browse_num:500,Star_num:600,UserName:uname},  
    }
    length := PostLength{Length:len(posts)}
    lengthAsBytes,_ := json.Marshal(length)
    APIstub.PutState("POSTLENGTH",lengthAsBytes)
 
    i := 0
    for i < len(posts) {
        fmt.Println("i is ", i)
        postAsBytes, _ := json.Marshal(posts[i])
        APIstub.PutState("POST"+strconv.Itoa(i), postAsBytes)
        fmt.Println("Added", posts[i])
        i = i + 1
    }
 
    return shim.Success(nil)
}
 
func (s *SmartContract) addPost(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
 
    if len(args) != 13 {
        return shim.Error("Incorrect number of arguments. Expecting 13")
    }

    filteredtitle := sensitiveSupervision(args[2])
    filteredcontent := sensitiveSupervision(args[3])

    creatorByte,_:= APIstub.GetCreator()
   certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
   if certStart == -1 {
      return shim.Error("No certificate found")
   }
   certText := creatorByte[certStart:]
   bl, _ := pem.Decode(certText)
   if bl == nil {
      return shim.Error("Could not decode the PEM structure")
   }

   cert, err := x509.ParseCertificate(bl.Bytes)
   if err != nil {
      return shim.Error("ParseCertificate failed")
   }
   uname:=cert.Subject.CommonName

    args10,error := strconv.Atoi(args[10])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }
    args11,error := strconv.Atoi(args[11])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }
    args12,error := strconv.Atoi(args[12])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }

    lengthAsBytes, _ := APIstub.GetState("POSTLENGTH")
    length := PostLength{}
    json.Unmarshal(lengthAsBytes,&length)
    newlength := length.Length+1  
    var post = Post{Id: strconv.Itoa(newlength), OriginalWebsite: args[0], OriginalID: args[1], Title: filteredtitle,Content:filteredcontent,AuthorId:args[4],PublishTime:args[5],UpdateTime:args[6],Category:args[7],SourceId:args[8],Labels:args[9],Follower_num:args10,Browse_num:args11,Star_num:args12,UserName:uname}
    postAsBytes, _ := json.Marshal(post)
    APIstub.PutState("POST"+strconv.Itoa(newlength), postAsBytes)
    length.Length = newlength
    lengthAsBytes,_ = json.Marshal(length)
    APIstub.PutState("POSTLENGTH",lengthAsBytes)
    return shim.Success(lengthAsBytes)
}
 
 
func (s *SmartContract) updatePost(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
 
    if len(args) != 14 {
        return shim.Error("Incorrect number of arguments. Expecting 14")
    }
    
    filteredtitle := sensitiveSupervision(args[3])
    filteredcontent := sensitiveSupervision(args[4])

    creatorByte,_:= APIstub.GetCreator()
   certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
   if certStart == -1 {
      return shim.Error("No certificate found")
   }
   certText := creatorByte[certStart:]
   bl, _ := pem.Decode(certText)
   if bl == nil {
      return shim.Error("Could not decode the PEM structure")
   }

   cert, err := x509.ParseCertificate(bl.Bytes)
   if err != nil {
      return shim.Error("ParseCertificate failed")
   }
   uname:=cert.Subject.CommonName

    args11,error := strconv.Atoi(args[11])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }
    args12,error := strconv.Atoi(args[12])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }
    args13,error := strconv.Atoi(args[13])
    if error != nil{
     return shim.Error("String conversion integer failed!")
    }
    
    var post = Post{Id: args[0], OriginalWebsite: args[1], OriginalID: args[2], Title: filteredtitle,Content:filteredcontent,AuthorId:args[5],PublishTime:args[6],UpdateTime:args[7],Category:args[8],SourceId:args[9],Labels:args[10],Follower_num:args11,Browse_num:args12,Star_num:args13,UserName:uname}
    postAsBytes, _ := json.Marshal(post)
    APIstub.PutState("POST"+args[0], postAsBytes)
    return shim.Success(nil)
}
 
 
func (s *SmartContract) richQueryPosts(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
 
    if len(args) != 3 {
        return shim.Error("Incorrect number of arguments. Expecting 3")
    }
 
    var queryString string
     
    if args[1] == "0" {
        queryString = fmt.Sprintf("{\"selector\":{\"%s\":\"%s\"}}", args[0],args[2])
    } else if args[1] == "1" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$gt\":%s}}}", args[0],args[2])
    } else if args[1] == "2" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$gte\":%s}}}", args[0],args[2])
    } else if args[1] == "3" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$lt\":%s}}}", args[0],args[2])
    } else if args[1] == "4" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$lte\":%s}}}", args[0],args[2])
    } else if args[1] == "5" {
      between := strings.Split(args[2], ",")
      queryString = fmt.Sprintf("{\"selector\":{\"$and\":[{\"%s\":{\"$gte\":%s}},{\"%s\":{\"$lte\":%s}}]}}", args[0],between[0],args[0],between[1])
    } else if args[1] == "6" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$regex\":\"(?i)%s\"}}}", args[0],args[2])
    } else if args[1] == "7" {
      betweena := strings.Split(args[0], ",")
      betweenv := strings.Split(args[2], ",")
      queryString = fmt.Sprintf("{\"selector\":{\"$and\":[{\"%s\":{\"$regex\":\"(?i)%s\"}},{\"%s\":{\"$regex\":\"(?i)%s\"}}]}}", betweena[0],betweenv[0],betweena[1],betweenv[1])
    }  else {
        return shim.Error("Incorrect number of arguments. Expecting 0~7")
    }
 
    resultsIterator, err := APIstub.GetQueryResult(queryString)
    if err != nil {
        return shim.Error(err.Error())
    }
    defer resultsIterator.Close()
 
    var buffer bytes.Buffer
    buffer.WriteString("[")
 
    bArrayMemberAlreadyWritten := false
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return shim.Error(err.Error())
        }
         
        if bArrayMemberAlreadyWritten == true {
            buffer.WriteString(",")
        }
        buffer.WriteString("{\"Key\":")
        buffer.WriteString("\"")
        buffer.WriteString(queryResponse.Key)
        buffer.WriteString("\"")
 
        buffer.WriteString(", \"Record\":")
         
        buffer.WriteString(string(queryResponse.Value))
        buffer.WriteString("}")
        bArrayMemberAlreadyWritten = true
    }
    buffer.WriteString("]")
 
    fmt.Printf("- richQueryPosts:\n%s\n", buffer.String())
 
    return shim.Success(buffer.Bytes())
}
 
 
func  (s *SmartContract) getPostNum(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
      
    if len(args) != 3 {
        return shim.Error("Incorrect number of arguments. Expecting 3")
    }
   var queryString string
     
    if args[1] == "0" {
        queryString = fmt.Sprintf("{\"selector\":{\"%s\":\"%s\"}}", args[0],args[2])
    } else if args[1] == "1" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$gt\":%s}}}", args[0],args[2])
    } else if args[1] == "2" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$gte\":%s}}}", args[0],args[2])
    } else if args[1] == "3" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$lt\":%s}}}", args[0],args[2])
    } else if args[1] == "4" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$lte\":%s}}}", args[0],args[2])
    } else if args[1] == "5" {
      between := strings.Split(args[2], ",")
      queryString = fmt.Sprintf("{\"selector\":{\"$and\":[{\"%s\":{\"$gte\":%s}},{\"%s\":{\"$lte\":%s}}]}}", args[0],between[0],args[0],between[1])
    } else if args[1] == "6" {
      queryString = fmt.Sprintf("{\"selector\":{\"%s\":{\"$regex\":\"(?i)%s\"}}}", args[0],args[2])
    }  else if args[1] == "7" {
      betweena := strings.Split(args[0], ",")
      betweenv := strings.Split(args[2], ",")
      queryString = fmt.Sprintf("{\"selector\":{\"$and\":[{\"%s\":{\"$regex\":\"(?i)%s\"}},{\"%s\":{\"$regex\":\"(?i)%s\"}}]}}", betweena[0],betweenv[0],betweena[1],betweenv[1])
    }  else {
        return shim.Error("Incorrect number of arguments. Expecting 0~7")
    }
 
    resultsIterator, err := APIstub.GetQueryResult(queryString)
    if err != nil {
        return shim.Error(err.Error())
    }
    defer resultsIterator.Close()
 
    i := 0
 
    for resultsIterator.HasNext() {
      resultsIterator.Next()
         
      i = i + 1
         
    }
     
 
    fmt.Printf("- getPostNum:\n%s\n", strconv.Itoa(i))
 
    return shim.Success([]byte(strconv.Itoa(i)))
}
 
func sensitiveSupervision(arg string) string {
  quertString := fmt.Sprintf("{\"content\":\"%s\"}",arg)
    resp, err := http.Post("http://101.201.211.174:8000",
        "application/x-www-form-urlencoded",
        strings.NewReader(quertString))
    if err != nil {
        fmt.Println(err)
    }

    defer resp.Body.Close()
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        fmt.Println(err)      
    }

    return string(body)
 

}
 
func main() {
    err := shim.Start(new(SmartContract))
    if err != nil {
        fmt.Printf("Error creating new Smart Contract: %s", err)
    }
}