var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const fs = require("fs");
const stripchar = require('stripchar').StripChar;
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid =require('gridfs-stream');
var sizeOf = require('image-size');
var upperCase = require('upper-case');


var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads/');
  },
  filename: function (req, file, callback) {
      callback(null, file.originalname) 
  }
});

var upload = multer({ storage : storage}).single('myFile');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')


app.get('/', function (req, res) {
  res.render('index');
})



app.post('/', function (req, res) {

	upload(req,res,function(err) {
			let name = req.body.ownName;
			 name = upperCase(name);
			let fname = req.body.fatherName;
			 fname = upperCase(fname);
			let dob  = req.body.dob;
			 dob = upperCase(dob);
			let pan = req.body.pan;
			 pan = upperCase(pan);	
			let ext = path.extname(req.file.originalname)
			let filename = req.file.originalname;
			let pa = "./uploads/"+filename;
			var dimensions = sizeOf(pa);


			if(err) 
			{
				return res.render('status',{scanstatus:"Error uploading file."});
			}
			else if(ext !== '.png' && ext !== '.jpg'  && ext !== '.jpeg')
			{
				return res.render('status',{scanstatus:"Only .jpeg images allowed !"})
			}
			else if(dimensions.width<500, dimensions.height<300)
			{
				return res.render('status',{scanstatus:"Size of scanned image is small !"})
			}
			else
			{
				var ocrname;
				var ocrfname;
				var ocrdate;
				var ocrpan;
				var j=0;
				var err_details="";
					const config = {
					  lang: 'eng',
					  oem: 1,
					  psm: 3
					}
					 
				var a = tesseract
				  .recognize(pa, config)
				  .then(text => {
				    var phaseone = text.split("\n")
				    var temp=[];
				    var first = /TAX|TA|INCOME|INCO|DEPARTMENT|DEPART|DEPAR|DEPA/;
				    for(var i = 0;i<=phaseone.length;i++)
				    	{
				    		var b = stripchar.RSExceptUnsAlpNum(phaseone[i],"/");
				    		if(b!=false)
				    			{
				    				temp.push(b);
				    			}

				    	}

				    for(var i = 0;i<=temp.length;i++)
				    {		var k = temp[i];
				    	    one = first.test(k);//test is used to find multiple substring
				    	    if(one!=-false && i!=(temp.length))
				    	    {
				    	    	ocrname = temp[i+1].replace(/[^A-Z]/g, " ");
				    	    	ocrfname = temp[i+2].replace(/[^A-Z]/g," ");
				    	    	ocrdate = temp[i+3].replace(/[^0-9/]/, "");
				    	    	ocrpan = temp[i+5];
				    	    	break;
				    	    }
				    }
	
					if(ocrname!=name)
						{
						j++;
						err_details+="\n Name didn't match. \n";
						}  
					if(ocrfname!= fname)
						{
						j++;
						err_details+=" \n Father's name didn't match. \n";
						} 
					if(ocrdate!=dob)
						{
						err_details+="\n D.O.B didn't match. \n";
						j++;
						} 
					if(ocrpan!=pan)
						{	
						err_details+="\n PAN didn't match. \n";
						j++;
						}

					if(j!=0)
						{
							return res.render('status',{scanstatus:err_details});
						}
					if(j==0)
						{
							var mongoDB = 'mongodb://127.0.0.1/pan_cardDB';
							mongoose.connect(mongoDB, { useNewUrlParser: true });
							var db = mongoose.connection;

							let gfs;


							db.on("error",console.error.bind(console,"connection error"));
							db.once("open",function(res,callback){
								console.log("Connection Succeeded");

							});

							var Schema = mongoose.Schema;

							var panSchema = new Schema({
								Cname:String,
								fathersname:String,
								d_o_b:String,
								pan_number:String,
								data: Buffer,
								contentType: String
							});
							var imgData = fs.readFileSync(pa);
							var panDetails = mongoose.model("panDetails",panSchema);
							//console.log(imgData);
							var cur_pan = new panDetails({
								Cname:name,
								fathersname:fname,
								d_o_b:dob,
								pan_number:pan,
								data: imgData,
								contentType : 'image/'+ext

							});
							
							cur_pan.save(function(error) {
							     return res.render('status',{scanstatus:"Data has been saved!"})
							 if (error) {
							     return res.render('status',{scanstatus:"Error in DB"})

							  }

							 });

		

							
						}				


				  })
				  .catch(err => {
				    return res.render('status',{scanstatus:err});
						  })


				
			}

		})

})




app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
