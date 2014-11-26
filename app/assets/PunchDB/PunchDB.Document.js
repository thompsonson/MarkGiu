_log.info("Loading PunchDB Document");
var PunchDB = PunchDB || {};
PunchDB.os = require("os");
 
function Document(options) {
    this.options = options;
    _log.info("Creating new Document");
 
    // decrypt it if requried
    if (this.options.data.encrypted){
        _log.info("this.options.data.encrypted - decrypting the data");
        this.options.data = this.decrypt();
    } else {
        _log.info("not encrypted data");
    }
 
    _log.info("adding required model data");    
    if(!('pdb_deleted' in options.data)) {
        options.data.pdb_deleted = false;
    }
    if(!('pdb_deleted_timestamp' in options.data)) {
        options.data.pdb_deleted_timestamp = null;
    }
    if(!('pdb_updated_hostname' in options.data)) {
        options.data.pdb_updated_hostname = null;
    }
    if(!('pdb_updated_timestamp' in options.data)) {
        options.data.pdb_updated_timestamp = null;
    }
 
    _log.info("mapping the data");   
    ko.mapping.fromJS(options.data, {}, this);
     _log.info("adding the helper variables/functions (those not to be stored)");   
    // dirtyFlag.isDirty() to get the dirty state
    this.dirtyFlag = new ko.dirtyFlag(this);
    this.db = options.db; 
    this.Collection = options.Collection;
    this.saveError = ko.observable(null);
}
 
Document.prototype.JsonFormatter = {
    stringify: function (cipherParams) {
        // create json object with ciphertext
        var jsonObj = {
            ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
        };
 
        // optionally add iv and salt
        if (cipherParams.iv) {
            jsonObj.iv = cipherParams.iv.toString();
        }
        if (cipherParams.salt) {
            jsonObj.s = cipherParams.salt.toString();
        }
 
        // stringify json object
        return JSON.stringify(jsonObj);
    },
 
    parse: function (jsonStr) {
        // parse json string
        var jsonObj = JSON.parse(jsonStr);
 
        // extract ciphertext from json object, and create cipher params object
        var cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
        });
 
       // optionally extract iv and salt
        if (jsonObj.iv) {
            cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
        }
        if (jsonObj.s) {
            cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
        }
 
        return cipherParams;
    }
}

Document.prototype.encrypt = function(){
    _log.info("Document.prototype.encrypt - called");
 
    var objToSave = ko.mapping.toJS(this);
    _log.info("Document.prototype.encrypt - objToSave: ", objToSave);
 
    var docToEncrypt = JSON.stringify(objToSave);
    _log.info("Document.prototype.encrypt - docToEncrypt: ", docToEncrypt);
 
    var enc = CryptoJS.AES.encrypt(docToEncrypt, that.Collection.password, { format: that.JsonFormatter });
    console.log("Document.prototype.encrypt - enc: ", enc);
    _log.info("Document.prototype.encrypt - enc: ");
 
    var encryptedDoc = {_id: this._id(), _rev: this._rev(), encrypted: enc.toString()};
    _log.info("Document.prototype.encrypt - encryptedDoc: ", encryptedDoc);
 
    return encryptedDoc;
}
 
Document.prototype.decrypt = function(){
    _log.info("Document.prototype.decrypt - called");
    if (this.options.data.encrypted && this.options.Collection.password){
 
        var decryptedDoc
        try{
            decrypted = CryptoJS.AES.decrypt(this.options.data.encrypted, this.options.Collection.password, { format: this.JsonFormatter });
            decryptedDoc = decrypted.toString(CryptoJS.enc.Utf8)
        } catch (ex) {
            _log.error(ex);
            decryptedDoc = "";
        }
       
        try {
            decryptedDoc = JSON.parse(decryptedDoc); 
            //decryptedDoc._id = doc._id; // overwriting... unnessacary i think now the _id and _rev are being encrypted and stored...
            //decryptedDoc._rev = doc._rev; 
        } catch (ex) {
            _log.error(ex);
            decryptedDoc = {};
        }
 
        return decryptedDoc;
 
    } else {
        _log.error("Document.prototype.decrypt - called without an encrypted property");
    }
}
 
Document.prototype.delete = function(){
    that = this;
 
    this.pdb_deleted(true);
    this.pdb_deleted_timestamp(new Date().toISOString());
    this.pdb_updated_hostname(PunchDB.os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());
 
    _log.debug(ko.mapping.toJS(this));
 
    this.update();
}

Document.prototype.update = function(){
    that = this;
    this.pdb_updated_hostname(PunchDB.os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());
    this.nonObservableObj = this.encrypt(); //ko.mapping.toJS(this);
    _log.debug(this.nonObservableObj);
 
    this.db.put(this.nonObservableObj, this._id(), this._rev(), function callback(err, doc){
        if (!err) {
            _log.info('Successfully updated');
            //update the Doc revision
            that._rev(doc.rev);
            // mark as clean
            that.dirtyFlag.reset();
        } else {
            _log.error(err);
            that.saveError(err);
        }
    });
}
  
 