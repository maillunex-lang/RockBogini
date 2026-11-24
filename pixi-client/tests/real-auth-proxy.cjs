const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{
 if(req.url?.startsWith('/next-api/v1/auth/')){
  const upstream=http.request({hostname:'api',port:18991,path:req.url.slice('/next-api'.length),method:req.method,headers:{...req.headers,host:'api:18991'}},r=>{res.writeHead(r.statusCode??502,r.headers);r.pipe(res)});
  upstream.on('error',()=>{res.writeHead(502);res.end('API unavailable')});req.pipe(upstream);return;
 }
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}
 const root='/client/dist',file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url));
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
 const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp'};
 fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'missing':b)});
}).listen(18992,'127.0.0.1');
