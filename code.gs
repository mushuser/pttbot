var __DEBUG__ = false


function debug_run() {
  var text = HtmlService.createHtmlOutputFromFile('tmp');
  
  var page = text.getContent()
  
  var o = parse_page(page)
}

var last_m = null;

var YESTERDAY = new Date()
var YESTERDAYx2 = new Date()
var now = new Date()

YESTERDAY.setDate(YESTERDAY.getDate() - 1)
YESTERDAYx2.setDate(YESTERDAYx2.getDate() - 2)
var YEAR = now.getFullYear()

// daily
function batch_get_interesting_ptt() {
  var posts = get_posts(YESTERDAY)
  var objs = []
  
  Logger.log(posts.length)
  for(var i in posts) {
    var post = posts[i]

    if(post.likes < 10){
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
    var objs = parse_page(t)
    
    if(objs == undefined) {
      throw "no obj return from parse_page()" 
    }
    
    var first_obj = objs[0]
    var ymd = get_ymd(date)
    
    if(first_obj.date >= ymd) {
      ret_objs = ret_objs.concat(objs) 
      continue
    } else {
      var last
      for(last=1; last<objs.length; last++) {
        var obj = objs[last]
        if(obj.date >= ymd) {
          break
        }
      }
      
      ret_objs = ret_objs.concat(objs.slice(last-1, objs.length)) 
      break
    } 
  }

  return ret_objs
}


function parse_section(text) {
  var re_removed = /(已被.*刪除)/
  var m_removed = re_removed.exec(text)
  if(m_removed) {
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


function parse_page(text) {
  var re_1 = /(<div class="nrec">[\s\S]*)<div class="r-list-sep">/g
  var m_1 = re_1.exec(text) 
  if(m_1 == undefined) {
    var m_text = text
  } else {
    var m_text = m_1[1]
  }
  
  var re_2 = /(<div class="nrec">[\s\S]*?<div class="mark">(.*?)<\/div>)/g
  
  var objs = []
  var m;
  
  while((m = re_2.exec(m_text)) != null) {
    if(m[1]) {
      var out = parse_section(m[1])  
      if(out) {
        objs.push(out)
      }
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


function get_ymd(date) {
 var return_date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);  
  
 return return_date
}