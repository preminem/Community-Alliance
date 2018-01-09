package main

import (
	"fmt"
	"encoding/json"
    "crypto/sha256"
    "crypto/x509"
    "encoding/pem"
    "crypto/ecdsa"
    "math/big"
    "time"
    "bytes"
   

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

type SmartContract struct {
}
//记得加两个字段。时间戳和是否被使用过！

type In   struct {
	Hash         string       `json:"hash"`
    Index        int          `json:"index"`
	ScriptSig_r  string       `json:"scriptsig_r"`
	ScriptSig_s  string       `json:"scriptsig_s"`
}

type Out  struct {
	Value        int          `json:"value"`
	Certificate  string       `json:"certificate"`
}

type Transaction struct {
    Tx_id         string      `json:"tx_id"`
    Copyright     string      `json:"copyright"`
    Version       string      `json:"version"`
    Tx_in_count   int         `json:"tx_in_count"`
    Tx_out_count  int         `json:"tx_out_count"`
    In            []In        `json:"in"`
    Out           []Out       `json:"out"`
}

type TransactionData struct {
    Tx_id         string      `json:"tx_id"`
    Copyright     string      `json:"copyright"`
    Version       string      `json:"version"`
    Tx_in_count   int         `json:"tx_in_count"`
    Tx_out_count  int         `json:"tx_out_count"`
    In            []In        `json:"in"`
    Out           []Out       `json:"out"`
    Time          string      `json:"time"`
    Use           bool        `json:"use"`
}

type Sig   struct {
	Tx_id         string      `json:"tx_id"`
	Certificate   string      `json:"certificate"`
} 


func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
    return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {
     
    function, args := APIstub.GetFunctionAndParameters()
     
    if function == "genesis" {
        return s.genesis(APIstub)
    } else if function == "transaction" {
        return s.transaction(APIstub, args)
    } else if function == "queryTransaction" {
        return s.queryTransaction(APIstub, args)
    } else if function == "queryBalance" {
        return s.queryBalance(APIstub)
    } else if function == "queryAllTransaction" {
        return s.queryAllTransaction(APIstub)
    } else if function == "getInput" {
        return s.getInput(APIstub)
    } 
    return shim.Error("Invalid Smart Contract function name.")
}


func (s *SmartContract) genesis(APIstub shim.ChaincodeStubInterface) sc.Response {
    
    timestamp, _ := APIstub.GetTxTimestamp()
    a := timestamp.Seconds
    timestring := time.Unix(a, 0).String()

    creatorByte,_:= APIstub.GetCreator()
    certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
    if certStart == -1 {
       return shim.Error("No certificate found")
    }
    certText := creatorByte[certStart:]
    certstring := string(certText)
    bl, _ := pem.Decode(certText)
    if bl == nil {
       return shim.Error("Could not decode the PEM structure")
    }

    cert, err := x509.ParseCertificate(bl.Bytes)
    if err != nil {
       return shim.Error("ParseCertificate failed")
    }
    uname:=cert.Subject.CommonName
    tx := TransactionData{Tx_id:uname,Copyright:"0",Version:"1.0",Tx_in_count:0,Tx_out_count:1,In:nil,Out:[]Out{Out{Value:1000000,Certificate:certstring},},Time:timestring,Use:false}
    txAsBytes, _ := json.Marshal(tx)
    APIstub.PutState(uname,txAsBytes)
    return shim.Success(nil)
}

func (s *SmartContract) transaction(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting 1")
    }
    //解析交易请求
    var req_tx Transaction
    var prev_tx TransactionData
    err := json.Unmarshal([]byte(args[0]), &req_tx)
    if err != nil {
        return shim.Error("Transaction Contract err !")
    }
    //开始验证交易合法性
    incount := 0
    outcount := 0
    var m, n  big.Int 
    var rr, ss *big.Int
    //遍历In
    for i:=0;i<req_tx.Tx_in_count;i++{
        
    	//获取input中指明的交易和证书
        TxAsBytes, err := APIstub.GetState(req_tx.In[i].Hash) 
        if err != nil {
           return shim.Error("GetState err!")
        
        }
        err = json.Unmarshal(TxAsBytes, &prev_tx)
        if err != nil {
           return shim.Error("Unmarshal err!")
        
        }
        rootPEM := prev_tx.Out[req_tx.In[i].Index].Certificate
        //从证书中提取公钥
        block, _ := pem.Decode([]byte(rootPEM))
        if block == nil {
           return shim.Error("block nil!")
        }
        cert, err := x509.ParseCertificate(block.Bytes)
        if err != nil {
           return shim.Error("x509 parse err!")
        }
        pub := cert.PublicKey.(*ecdsa.PublicKey)
        //开始验证
        strdata := fmt.Sprintf("{\"tx_id\":%s,\"certificate\":%s}",req_tx.Tx_id,rootPEM)
        fmt.Println(strdata)
        h2 := sha256.New()
        h2.Write([]byte(strdata))
        hashed := h2.Sum(nil)
        m.SetString(req_tx.In[i].ScriptSig_r, 10)   //大于int64的数字要用到SetString函数
        n.SetString(req_tx.In[i].ScriptSig_s, 10)
        rr = &m
        ss = &n
        result := ecdsa.Verify(pub, hashed, rr, ss)
        if result != true {
           return shim.Error("Verification failed")
        } 
        incount += prev_tx.Out[req_tx.In[i].Index].Value
    }    
    //遍历Out
    for i:=0;i<req_tx.Tx_out_count;i++{
        outcount += req_tx.Out[i].Value
    }
    if outcount != incount {
    	return shim.Error("The incount and outcount amount is wrong!")
    }
    //验证交易合法完成
    //添加交易
    timestamp, _ := APIstub.GetTxTimestamp()
    a := timestamp.Seconds
    timestring := time.Unix(a, 0).String()
    sto_tx := TransactionData{Tx_id:req_tx.Tx_id,Copyright:req_tx.Copyright,Version:req_tx.Version,Tx_in_count:req_tx.Tx_in_count,Tx_out_count:req_tx.Tx_out_count,In:req_tx.In,Out:req_tx.Out,Time:timestring,Use:false}
    sto_txAsBytes, _ := json.Marshal(sto_tx)
    APIstub.PutState(sto_tx.Tx_id, sto_txAsBytes)
    fmt.Println("Added Transaction", sto_tx)
    //修改使用过的output
    prev_tx = TransactionData{Tx_id:prev_tx.Tx_id,Copyright:prev_tx.Copyright,Version:prev_tx.Version,Tx_in_count:prev_tx.Tx_in_count,Tx_out_count:prev_tx.Tx_out_count,In:prev_tx.In,Out:prev_tx.Out,Time:prev_tx.Time,Use:true}
    prev_txAsBytes, _ := json.Marshal(prev_tx)
    APIstub.PutState(prev_tx.Tx_id, prev_txAsBytes)
    return shim.Success(nil)
}

func (s *SmartContract) queryTransaction(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
  if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting 1")
    }
    txAsBytes, _ := APIstub.GetState(args[0])
    return shim.Success(txAsBytes)
}

func (s *SmartContract) queryAllTransaction(APIstub shim.ChaincodeStubInterface) sc.Response {
    queryString := fmt.Sprintf("{\"selector\":{\"version\":\"1.0\"}}")
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
 
    fmt.Printf("- queryAllTransaction:\n%s\n", buffer.String())
 
    return shim.Success(buffer.Bytes())
}

func (s *SmartContract) getInput(APIstub shim.ChaincodeStubInterface) sc.Response {
    queryString := fmt.Sprintf("{\"selector\":{\"use\":false}}")
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
 
    fmt.Printf("- queryAllTransaction:\n%s\n", buffer.String())
 
    return shim.Success(buffer.Bytes())
}

func (s *SmartContract) queryBalance(APIstub shim.ChaincodeStubInterface) sc.Response {
    a := "10000"
    return shim.Success([]byte(a)) 
}

func main() {
    err := shim.Start(new(SmartContract))
    if err != nil {
        fmt.Printf("Error creating new Smart Contract: %s", err)
    }
}