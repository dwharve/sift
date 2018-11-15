var base64 = require('base-64');
var path = require('path');
var express = require('express');
var app = express();
var cp = require('child_process');
var exec = cp.exec;
var elasticsearch = require('elasticsearch');
var fs = require('fs');
var client = new elasticsearch.Client({
  host: 'elasticsearch:9200',
});

var port = 80;

client.indices.exists({'index': 'sift'},(err,resp)=>{
  if(!resp){
    client.indices.create({index:'sift',body:{settings:{index:{number_of_shards:1,number_of_replicas:1}}}},(err,resp)=>{
     console.log("Created index sift"); 
});
  }
});


app.get('/',(req,res)=>{
  res.sendFile('/opt/frontend/instructions.html');
});

app.get('/kit-sift',(req,res)=>{
  res.sendFile('/opt/frontend/kit-sift');
});

app.get('/remove/:name',(req,res)=>{
  exec('sha1sum '+req.params.name+' | awk \'{print $1}\' | tr -d \'\\n\'',{cwd:'/data'},(err,stdout,stderr)=>{
    console.log(err+" | "+stderr);
    if(stdout == "" ){ 
      res.send("BADNAME");
    }else{
      client.search({index:'sift',q:'image:'+stdout},(err,resp)=>{
        if(resp.hits.total != 0){
          client.delete({index:'sift',type:'doc',id:resp.hits.hits[0]._id},(err,resp)=>{
            if(resp.result == "deleted"){ fs.unlink('/data/'+req.params.name); res.send('OK'); return;}
            else{ res.send('BAD'); return;}
          });
        }else{
          res.send('BADNAME');
        }
      });
    }
  });
});

app.get('/delete/:cmd',(req,res)=>{
  client.search({index:'sift',q:'cmd:'+req.params.cmd},(err,resp)=>{
    if(resp.hits.total != 0){
      client.delete({index:'sift',type:'doc',id:resp.hits.hits[0]._id},(err,resp)=>{
        if(resp.result == "deleted"){
          res.send('OK');
        }else{
          res.send('BAD');
        }
      });
    }else{
      res.send('OK');
    }
  });
});
app.get('/cmd/:cmd', (req,res)=>{
  client.search({index:'sift',q:'cmd:'+req.params.cmd},(err,resp)=>{
    if(resp.hits.total == 0 ){
      var execCmd = base64.decode(req.params.cmd);
      exec(execCmd,{cwd:'/data'},(error,stdout,stderr)=>{
        client.index({index:'sift',type:'doc',body:{cmd:req.params.cmd,stderr:stderr,stdout:stdout}},(err,resp)=>{
          res.write(stderr);
          res.write(stdout);
          res.end();
        });
      });
    }else{
      res.write(resp.hits.hits[0]._source.stderr);
      res.write(resp.hits.hits[0]._source.stdout);
      res.end();
    }
  });
});

app.get('/ls',(req,res)=>{
  client.search({index:'sift',body:{query:{exists:{field:"image"}}}},(err,resp)=>{
    var output = "";
    for(i=0;i<resp.hits.hits.length;i++){
      output += resp.hits.hits[i]._source.name + "\t" + resp.hits.hits[i]._source.image;
    }
    res.send(output);
  });
});

app.get('/image/:name/:hash', (req,res)=>{
  client.search({index:'sift',q:'image:'+req.params.hash},(err,resp)=>{
    if(resp.hits.total == 0){
      client.index({index:'sift',type:'doc',body:{name:req.params.name,image:req.params.hash}});
    }else if(resp.hits.hits[0]._source.name != req.params.name){
      res.send('BADNAME'); return;
    }
    exec('sha1sum '+req.params.name+' | awk \'{print $1}\' | tr -d \'\\n\'',{cwd:'/data'},(err,stdout,stderr)=>{
      if(stdout == req.params.hash){
        res.send('OK'); return;
      }
      res.send('BAD');
    });
  });
});

app.listen(port, () => console.log(`Frontend app listening on port ${port}!`));

