var __DEBUG__ = false


function debug_run() {
  var text = HtmlService.createHtmlOutputFromFile('tmp');
  
  var page = text.getContent()
  
  var o = parse_page(page)
}


function parse_page(text) {
  var re = /(?:<span class="hl f\d">(.*)<\/span>|(<div class="nrec"><\/div>)|(\(本文已被刪除\) \[.*\])|bbs\/Gossiping\/(M.*html)">(.*)<\/a>|<div class="date">(.*)<\/div>)/g
  
  var m;
  var objs = []

  var obj = {
    "likes":null,
    "file":null,
    "title":null,
    "date_str":null
  }
  
  while((m = re.exec(text)) != null) {
    obj.likes = obj.likes || m[1] || m[2]
    obj.file = obj.file || m[3] || m[4]
    obj.title = obj.title || m[3] || m[5]
    obj.date_str = obj.date_str || m[6]
    
    if( obj.likes == '<div class="nrec"><\/div>') {
      obj.likes = 1
    }

    if(obj.likes && obj.file && obj.title && obj.date_str) {
      var date_splitted = obj.date_str.split("/")
      var m = date_splitted[0] - 1
      var d = date_splitted[1]
     
      var date = new Date(YEAR, m, d)
      
      var obj_in = {
        "likes":obj.likes,
        "file":obj.file,
        "title":obj.title,
        "date":date
      }
  
      objs.push(obj_in)
      
      obj.likes = null
      obj.file = null
      obj.title = null
      obj.date_str = null
    }

  }
  
  return objs  
}

var YESTERDAY = new Date()
var YESTERDAYx2 = new Date()
YESTERDAY.setDate(YESTERDAY.getDate() - 1)
YESTERDAYx2.setDate(YESTERDAYx2.getDate() - 2)
var YEAR = YESTERDAY.getFullYear()

function get_posts_yesterday() {
  var url_base = "https://www.ptt.cc"
  var entry_url = url_base + "/bbs/Gossiping/index.html"

  var headers = {
    "cookie":"over18=1"
  }
  
  var options = {
    "method":"post",
    "headers":headers
  }
     
  var next_url;
  var ret_objs = []

  while(true) {
    if(next_url) {
      var url = url_base + next_url
    } else {
      var url = entry_url    
    }
      
    var r = httplib.httpretry(url, options)
    var t = r.getContentText()
    var re = /<a class="btn wide" href="(\/bbs\/Gossiping\/index\d*\.html)">&lsaquo;/
    var next_url = re.exec(t)[1]
    
    var objs = parse_page(t)

    ret_objs = ret_objs.concat(objs)

    var obj = objs[objs.length-1]

    if(httplib.is_same_date(YESTERDAYx2, obj.date)) {
      break
    }   
  }

  return ret_objs
}

// daily
function batch_get_interesting_ptt() {
  var posts = get_posts_yesterday()
  var objs = []
  
  for(var i in posts) {
    var post = posts[i]

    if(!httplib.is_same_date(YESTERDAY, post.date) || (post.likes < 10)) {
      continue
    }   

    var title = post.title.toLowerCase()
    var file = post.file

    var keywords = []
    
    for(var i2 in secret.interesting_keywords) {
      var keyword = secret.interesting_keywords[i2]  

      if(title.indexOf(keyword) > -1) {
        keywords.push(keyword)        
      }            
    }  
    
    if(keywords.length > 0) {
      keywords = httplib.get_unique(keywords)
      
      var obj = {
        "likes":post.likes,
        "title":title.slice(0,20),
        "file":file,
        "keywords":keywords
      }

      objs.push(obj)
    }
  }

  var mail_title = Utilities.formatString("[ptt] %d", objs.length)
  var mail_lines = ""
  var link_prefix = "https://www.ptt.cc/bbs/Gossiping/"
  
  for(var i in objs) {
    var obj = objs[i]
    var link = link_prefix + obj.file
    var index = parseInt(i) + 1
    mail_lines = mail_lines + Utilities.formatString("[%02d][%02d]%s ,%s ,%s\n\n", index, obj.likes, obj.keywords, link, obj.title)
  }
  
  if(objs.length > 0) {
    var mail = Session.getActiveUser().getEmail()
    
    if( __DEBUG__ == false ) {
      MailApp.sendEmail(mail, mail_title, mail_lines)
    } else {
      Logger.log(mail_title)  
      Logger.log(mail_lines)  
    }
  }
}