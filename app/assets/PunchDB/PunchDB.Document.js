console.log("Loading PunchDB Document");
 
var PunchDB = PunchDB || {};
 
PunchDB.os = require("os");
function Document(options) {
 
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
 
    ko.mapping.fromJS(options.data, {}, this);
 
    // dirtyFlag.isDirty() to get the dirty state
    this.dirtyFlag = new ko.dirtyFlag(this);
    this.db = options.db;  
    this.Collection = options.Collection;
    this.saveError = ko.observable(null);
 
}
 
Document.prototype.delete = function(){
    that = this;
 
    this.pdb_deleted(true);
    this.pdb_deleted_timestamp(new Date().toISOString());
    this.pdb_updated_hostname(PunchDB.os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());
 
    console.log(ko.mapping.toJS(this));
 
    this.update();
}
Document.prototype.update = function(){
    that = this;
 
    this.pdb_updated_hostname(PunchDB.os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());
    this.nonObservableObj = ko.mapping.toJS(this);
 
    console.log(this.nonObservableObj);
  
    this.db.put(this.nonObservableObj, this.nonObservableObj._id, this.nonObservableObj._rev, function callback(err, doc){
        if (!err) {
            console.log('Successfully updated');
            //update the Doc revision
            that._rev(doc.rev);
            // mark as clean
            that.dirtyFlag.reset();
        } else {
            console.log("error");
            console.log(err);
            that.saveError(err);
        }
    });
}
 
 