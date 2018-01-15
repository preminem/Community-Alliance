## 基于balance-transfer的改动如下：
1.将原有chaincode替换成community.go和asset.go。
2.在docker-compose.yaml文件里为每个peer设置了couchdb。
3.在app.js上加了一个版权交易的路由，该路由首先会查找帖子，然后进行版权交易。
4.实现版权交易的功能由app/ copyrightTransaction.js实现。
5.在app/helper.js里加了一个getkey功能，可以获得当前用户的公钥和私钥，这在版权交易的时候会使用到。
6.在testAPIs.sh中加入了对两个chaincode的安装和实例化，加入了增加帖子和查询帖子，加入了进行版权交易和查询所有版权交易信息等多个测试。
