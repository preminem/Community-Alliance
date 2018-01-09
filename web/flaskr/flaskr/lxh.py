from flask import Flask, render_template, request, session, redirect, url_for
import json
import urllib.request






app = Flask(__name__) # create the application instance :)
app.config.from_object(__name__) # load config from this file , flaskr.py

app.config.update(dict(    
    SECRET_KEY='development key',    
))

@app.route('/')
def show_entries():
   return render_template('lxh0.html')

@app.route('/<param>', methods=['GET','POST'])
def home(param):
   if param != "iscas" and param != "kexun" and param != "zhihu":
       return redirect(url_for('show_entries'))
   else:
   	   session['name'] = param
   url = "http://101.201.211.174:8888/select?func=richQueryPosts&attribute=category&operator=0&value=topic"
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   posts = json.loads(res)
   return render_template('lxh1.html', posts=posts)

@app.route('/query', methods=['POST'])
def querytitle():
   content = urllib.request.quote(request.form['name'])
   url = 'http://101.201.211.174:8888/select?func=richQueryPosts&attribute=category,title&operator=7&value=topic,%s'%content
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   posts = json.loads(res)
   return render_template('lxh1.html', posts=posts)

@app.route('/topic/<param>')
def topiccontent(param):
   _url = 'http://101.201.211.174:8888/select?func=queryPost&id=%s'%param    #查找该话题
   _req = urllib.request.Request(_url)
   _res_data = urllib.request.urlopen(_req)
   _res = _res_data.read()
   _post = json.loads(_res)
   contentwebsite = urllib.request.quote(_post['originalwebsite'])
   contentid = urllib.request.quote(_post['originalid'])
   url = 'http://101.201.211.174:8888/select?func=richQueryPosts&attribute=originalwebsite,sourceid&operator=7&value=%s,%s'%(contentwebsite,contentid)  #查找该话题的评论
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   posts = json.loads(res)
   return render_template('lxh2.html', posts=posts,_post=_post)

@app.route('/reply/<param>')
def replycontent(param):
   _url = 'http://101.201.211.174:8888/select?func=queryPost&id=%s'%param    #查找该评论
   _req = urllib.request.Request(_url)
   _res_data = urllib.request.urlopen(_req)
   _res = _res_data.read()
   _post = json.loads(_res)
   contentsource = urllib.request.quote(_post['sourceid'])
   url = 'http://101.201.211.174:8888/select?func=richQueryPosts&attribute=originalid&operator=0&value=%s'%(contentsource)  #查找该评论对应的话题
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   post = json.loads(res)
   print(session['name'])
   return render_template('lxh3.html', post=post,_post=_post)

@app.route('/reply/buy/<param>')
def buy(param):
   url = 'http://127.0.0.1:8888/select?func=StartTransaction&id=%s'%param    #查找该评论
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   tx = json.loads(res)
   return render_template('lxh4.html', tx=tx)

@app.route('/transactionrecord')
def record():
   url = 'http://127.0.0.1:8888/select?func=queryAllTransaction'   #查找该评论
   req = urllib.request.Request(url)
   res_data = urllib.request.urlopen(req)
   res = res_data.read()
   alltxs = json.loads(res)
   return render_template('lxh5.html', alltxs=alltxs)

   

if __name__ == '__main__':
	
    app.run()