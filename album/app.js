'use strict';
const express = require('express');
//解析post请求体数据
const bodyParser = require('body-parser');
//文件功能增强的包
const fse = require('fs-extra');
//解析上传文件的包
const formidable = require('formidable');
//引入path核心对象
const path = require('path');


//引入数据库对象
const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: 'lhh',
    database: 'album'
});

//创建服务器
let app = express();

//配置模板引擎
app.engine('html',require('express-art-template'));

//配置路由规则
let router = express.Router();
//测试路由
router.get('/test', (req, res, next) => {
    pool.getConnection(function (err, connection) {
        connection.query('SELECT * FROM album_dir', function (error, results, fields) {
            //查询完毕以后，释放连接
            connection.release();
            if (error) throw error;
            res.render('test.html', {
                text: results[3].dir
            });
        });
    });
})
//显示相册列表
.get('/',(req,res,next)=>{
    //获取连接
    pool.getConnection((err,connection)=>{
        // 处理获取连接时的异常  eg:停网
        if(err) return next(err);
        //使用连接查询所有的album_dir所有数据
        connection.query('select * from album_dir',(error,results)=>{
            //查询完毕以后，释放连接
            connection.release();
            //处理查询时带来的异常 eg:表明错误
            if (error) return next(error);
            res.render('index.html',{
                album: results
            });
        });
    });
    
})
//显示照片列表
.get('/showDir',(req,res,next)=>{
    //获取url上的查询字符串
    let dirname = req.query.dir;
    // console.log(dirname);
    pool.getConnection((err, connection) => {
        // 处理获取连接时的异常  eg:停网
        if (err) return next(err);
        //使用连接查询所有的album_dir所有数据
        connection.query('select * from album_file where dir = ?',[dirname], (error, results) => {
            //查询完毕释放连接
            connection.release();
            //处理查询时带来的异常 eg:表明错误
            if (error) return next(error);

            //记录相册名
            res.render('album.html', {
                album: results,
                dir: dirname
            });
        });
    });

})
//添加目录
.post('/addDir',(req,res,next)=>{
    let dirname = req.body.dirname;
    // console.log(dirname);
    pool.getConnection((err, connection) => {
        // 处理获取连接时的异常  eg:停网
        if (err) return next(err);
        //使用连接查询所有的album_dir所有数据
        connection.query('insert into album_dir values (?)',[dirname], (error, results) => {
            //查询完毕释放连接
            connection.release();
            //处理查询时带来的异常 eg:表明错误
            if (error) return next(error);
            

            //创建本地文件
            const dir = `./resource/${dirname}`;
            //确保目录存在
            fse.ensureDir(dir,err=>{
                //重新看相册
                res.redirect('/showDir?dir='+dirname);
            })
        });
    });
})
//添加照片
.post('/addPic',(req,res,next)=>{
    var form = new formidable.IncomingForm();

    let rootPath = path.join(__dirname,'resource');
    //设置默认上传目录
    form.uploadDir = rootPath;
    form.parse(req,function(err,fields,files){
        if(err) return next(err);

        let filename = path.parse(files.pic.path).base;
        //移动文件           resource   文件路径   文件名
        let dist = path.join(rootPath,fields.dir,filename);
        fse.move(files.pic.path,dist,(err)=>{
            if(err) throw next(err);

            //将数据保存进数据库
            //file:/resource/aaa/upload_dd10f264c02f08e9031a0bd3f7eb090a
            let db_file = `/resource/${fields.dir}/${filename}`;
            // console.log(db_file);
            let db_dir = fields.dir;
            // console.log(db_dir);

            pool.getConnection((err, connection)=> {
                    //处理获取连接时的异常，比如停网了
                    if(err) return next(err);
                    //使用连接查询所有的album_dir所有数据
                    connection.query('insert into album_file values (?,?)',[db_file,db_dir],(error, results)=>{

                        //查询完毕以后，释放连接
                        connection.release();
                        //处理查询时带来的异常，比如表名错误
                        if(err) return next(err);
                        //重定向到看相片的页面
                        res.redirect('/showDir?dir='+ db_dir);
                    })
                });
        })
    })
})


//处理静态资源
app.use('/public',express.static('./public'));
//向外暴露相片静态资源目录
app.use('/resource',express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
//parse application/json
app.use(bodyParser.json());
// 中间件执行列表
app.use(router);
// 处理错误中间件
app.use((err,req,res,next)=>{
    console.log('出错了---------');
    console.log(err);
    console.log('出错了---------');
    res.send(
        `
        您访问的页面出异常啦，请稍后再试......
        <a href="/">回首页</a>
        `
    );
})
// 开启服务器

app.listen(8888,()=>{
    console.log('服务器启动');
})
