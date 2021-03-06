(function(window){
  window.utils = {
    parseQueryString: function(str) {
      var ret = Object.create(null);

      if (typeof str !== 'string') {
        return ret;
      }

      str = str.trim().replace(/^(\?|#|&)/, '');

      if (!str) {
        return ret;
      }

      str.split('&').forEach(function (param) {
        var parts = param.replace(/\+/g, ' ').split('=');
        var key = parts.shift();
        var val = parts.length > 0 ? parts.join('=') : undefined;

        key = decodeURIComponent(key);
        val = val === undefined ? null : decodeURIComponent(val);

        if (ret[key] === undefined) {
          ret[key] = val;
        } else if (Array.isArray(ret[key])) {
          ret[key].push(val);
        } else {
          ret[key] = [ret[key], val];
        }
      });

      return ret;
    }
  };
})(window);

function DropboxSync(cb) {
  let params = {};
  this.ACCESS_TOKEN = localStorage.accessToken || '';
  if(!this.ACCESS_TOKEN.length) {
    this.active = false;
    params.clientId = 'sibkhcynf2fp4rp';
  }
  else {
    this.active = true;
    params.accessToken = this.ACCESS_TOKEN;
  }

  this.dbx = new Dropbox(params);

  this.setActive(cb);
}

DropboxSync.prototype.load = function(name, callback) {
  if(this.isActive()) {
    let path = '/' + name + '.opml';

    $.ajax({
      method: 'post',
      url: 'https://content.dropboxapi.com/2/files/download',
      headers: {
        'Authorization': 'Bearer ' + this.ACCESS_TOKEN,
        'Dropbox-API-Arg': '{"path":"'+path+'"}'
      },
      success: function(data) {
        callback(null, data);
      },
      error: function(jqXHR, status, err) {
        callback(err);
      }
    });
  }
}

DropboxSync.prototype.setActive = function() {
  if(!this.isActive()) {
    let access_token = this.getAccessTokenFromUrl();
    if(access_token && access_token.length) {
      this.active = true;
      this.ACCESS_TOKEN = access_token;
      this.dbx.setAccessToken(this.ACCESS_TOKEN);
      localStorage.accessToken = this.ACCESS_TOKEN;
    }
    else {
      this.ACCESS_TOKEN = '';
      this.active = false;
    }
  }
}

DropboxSync.prototype.getAccessTokenFromUrl = function() {
  return utils.parseQueryString(window.location.hash).access_token;
}

DropboxSync.prototype.isActive = function() {
  return this.active;
}

DropboxSync.prototype.activate = function() {
  let authUrl = this.dbx.getAuthenticationUrl('https://outliner.xangelo.ca/');
  $('#authDropbox').on('click', function(e){
    window.location = authUrl;
  });
  $('#welcomeModal').modal();
}

DropboxSync.prototype.resync = function(lastSaved, name, cb) {
  let path = '/' + name + '.opml';
  this.dbx.filesGetMetadata({
    path: path
  }).then(function(response){
    let lastModified = new Date(response.client_modified).getTime();
    let now = new Date().getTime();

    if((now - lastSaved) >= lastModified) {
      return cb(null, true);
    }
    else {
      return cb(null, false);
    }
  }).catch(function(err) {
    return cb(err, false);
  });
}

DropboxSync.prototype.lastSaveTime = function() {
  return localStorage.lastSaveTime;
}

DropboxSync.prototype.create = function(name, data, cb) {
  let path = '/' + name + '.opml';
  var blob = new Blob([data], {
    type: 'application/xml'
  });
  this.dbx.filesUpload({
    path: path,
    contents: blob
  }).then((response) => {
    localStorage.lastSaveTime = Date.now();
    cb(null, response);
  }).catch(function(e){
    cb(e);
  });
}

DropboxSync.prototype.save = function(name, data, cb) {
  let path = '/' + name + '.opml';
  var blob = new Blob([data], {
    type: 'application/xml'
  });
  this.dbx.filesUpload({
    path: path,
    contents: blob,
    mode: {
      '.tag': 'overwrite'
    }
  }).then((response) => {
    localStorage.lastSaveTime = Date.now();
    cb(null, response);
  }).catch(function(e){
    cb(e);
  });
}
