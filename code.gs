var __DEBUG__ = false


function debug_run() {
  var text = HtmlService.createHtmlOutputFromFile('tmp');
  
  var page = text.getContent()
  
  var o = parse_page_new(page)
}

var last_m = null;

function parse_page(text) {
  var re = /(?:<span class="hl f\d">(\d*)<\/span>|(<div class="nrec"><\/div>)|(\(本文已被刪除\) \[.*\])|bbs\/Gossiping\/(M.*html)">(.*)<\/a>|<div class="date">(.*)<\/div>|<div class="mark">(.*)<\/div>)/g
  
  var m;
  var objs = []

  var obj = {
    "likes":null,
    "file":null,
    "title":null,
    "date_str":null,
    "mark":null
  }

  
  while((m = re.exec(text)) != null) {
    Logger.log(m)
    obj.likes = obj.likes || m[1] || m[2]
    obj.file = obj.file || m[3] || m[4]
    obj.title = obj.title || m[3] || m[5]
    obj.date_str = obj.date_str || m[6]
    obj.mark = obj.mark || m[7]
    
    if( obj.likes == '<div class="nrec"><\/div>') {
      obj.likes = 1
    }
    
    if( obj.likes == '爆' ) {
      obj.likes = 99
    }

//    Logger.log(obj)
    
    if(obj.likes && obj.file && obj.title && obj.date_str && obj.mark) {
      var date_splitted = obj.date_str.split("/")
      var m = date_splitted[0] - 1
      var d = date_splitted[1]
      
      if(last_m == null) {
        last_m = m  
      }
      
      if(m <= last_m) {
        var date = new Date(YEAR, m, d)
      } else {
        var date = new Date(YEAR-1, m, d)
      }
      
//      console.log(date)
//      Logger.log(obj.title)
//      Logger.log(obj.mark)
      var obj_in = {
        "likes":obj.likes,
        "file":obj.file,
        "title":obj.title,
        "date":date,
        "mark":obj.mark
      }
  
//      if((obj.mark == "!") || (obj.mark == "M")) {
//        ;;
//      } else {
//        objs.push(obj_in)
//      }
      
      objs.push(obj_in)
      
      obj.likes = null
      obj.file = null
      obj.title = null
      obj.date_str = null
      obj.mark = null
    }
  }
  
  return objs  
}

var YESTERDAY = new Date()
var YESTERDAYx2 = new Date()
var now = new Date()

YESTERDAY.setDate(YESTERDAY.getDate() - 1)
YESTERDAYx2.setDate(YESTERDAYx2.getDate() - 2)
var YEAR = now.getFullYear()

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
  
  var mail = Session.getActiveUser().getEmail()
  if(objs.length > 0) {
    if( __DEBUG__ == false ) {
      MailApp.sendEmail(mail, mail_title, mail_lines)
    } else {
      Logger.log(mail_title)  
      Logger.log(mail_lines)  
    }
  } else if(objs.length == 0) {
    MailApp.sendEmail(mail, '[ptt] no posts', 'It\'s a good day!')
  }
}


// 
function batch_get_hotlines_yesterday(likes) {
  if(likes == undefined) {
    likes = 30
  }
  var n = new Date()
  var posts = get_posts(n)
  var objs = []
  
  //Logger.log(posts)
  
  return
  
  for(var i in posts) {
    var post = posts[i]

    if(!httplib.is_same_date(now, post.date) || (post.likes < likes)) {
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

  
  Logger.log(objs)
  
  return 
  
  
  var mail_title = Utilities.formatString("[ptt] %d", objs.length)
  var mail_lines = ""
  var link_prefix = "https://www.ptt.cc/bbs/Gossiping/"
  
  for(var i in objs) {
    var obj = objs[i]
    var link = link_prefix + obj.file
    var index = parseInt(i) + 1
    mail_lines = mail_lines + Utilities.formatString("[%02d][%02d]%s ,%s ,%s\n\n", index, obj.likes, obj.keywords, link, obj.title)
  }
  
  var mail = Session.getActiveUser().getEmail()
  if(objs.length > 0) {
    if( __DEBUG__ == false ) {
      MailApp.sendEmail(mail, mail_title, mail_lines)
    } else {
      Logger.log(mail_title)  
      Logger.log(mail_lines)  
    }
  } else if(objs.length == 0) {
    MailApp.sendEmail(mail, '[ptt] no posts', 'It\'s a good day!')
  }
}


function get_posts(date) {
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
//    Logger.log(next_url)
    var objs = parse_page(t)
  
    for(var i in objs) {
//      Logger.log(objs[i])  
    }
   
    var obj = objs[objs.length-1]
    
//    Logger.log(objs)
//    Logger.log(obj.date)
    return
    if(obj.date >= date) {
      ret_objs = ret_objs.concat(objs)
    }
    
    Logger.log(ret_objs)
    
    return
    var nn = new Date()
    var prior_date = new Date(); 
    prior_date = prior_date.setDate(nn.getDate() - 1)
    Logger.log(prior_date)
    Logger.log(obj.date)
    if(obj.date <= prior_date) {
      break
    }   
  }

  return ret_objs
}

function parse_section(text) {
  if(text.indexOf("本文已被刪除")>=0) {
    return undefined
  }
  
  var obj = {}

  var re_likes = /<span class="hl f\d">(.*)<\/span>/
  var m_likes = re_likes.exec(text)
  var likes = 0
  
  if(m_likes == undefined) {
    likes = 0  
  } else {
    if( m_likes[1] == '爆' ) {
      likes = 99
    } else {
      likes = parseInt(m_likes[1])
    }
  }
  
  var re_file = /bbs\/Gossiping\/(M.*html)">.*<\/a>/
  var m_file = re_file.exec(text)
  var file = m_file[1]  
  
  var re_title = /bbs\/Gossiping\/M.*html">(.*)<\/a>/
  var m_title = re_title.exec(text)
  var title = m_title[1]  
    
  
  var re_date = /<div class="date">(.*)<\/div>/
  var m_date = re_date.exec(text)
  var date_str = m_date[1]
  var date = parse_date_str(date_str)
  
  var re_mark = /<div class="mark">(.*)<\/div>/
  var m_mark = re_mark.exec(text)
  var mark = m_mark[1]
  
  obj = { mark:mark,
         date_str:date_str,
         date:date,
         title:title,
         file: file,
         likes:likes}
    
  return obj   
}

function parse_page_new(text) {
  var re = /(<div class="nrec">[\s\S]*?<div class="mark">(.*?)<\/div>)/g
  
  var objs = []
  var m;
  
  while((m = re.exec(text)) != null) {
    objs.push(m[1])
  }
  
  for(var i in objs) {
    var out = parse_section(objs[i])
    if(out != undefined) {
      Logger.log(out)  
    }
  }
  
  return objs  
}


function parse_date_str(date_str) {
  var date_splitted = date_str.split("/")
  var m = date_splitted[0] - 1
  var d = date_splitted[1]
  
  if(last_m == null) {
    last_m = m  
  }
  
  if(m <= last_m) {
    var date = new Date(YEAR, m, d)
  } else {
    var date = new Date(YEAR-1, m, d)
  }
  
  return date
}
