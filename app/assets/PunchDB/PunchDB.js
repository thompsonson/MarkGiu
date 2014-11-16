console.log("Loading PunchDB.js");

var os = require("os");

function Document(options) {
    ko.mapping.fromJS(options.data, {}, this);
 
    this.db = options.db;   
    this.saveError = ko.observable(null);

}

Document.prototype.delete = function(){
    that = this;

    this.pdb_deleted(true);
    this.pdb_deleted_timestamp(new Date().toISOString());
    this.pdb_updated_hostname(os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());

    console.log(ko.mapping.toJS(this));

    this.update();
}
 
Document.prototype.update = function(){
    that = this;

    this.pdb_updated_hostname(os.hostname());
    this.pdb_updated_timestamp( new Date().toISOString());
 
    this.nonObservableObj = ko.mapping.toJS(this);

    console.log(this.nonObservableObj);
   
    this.db.put(this.nonObservableObj, this.nonObservableObj._id, this.nonObservableObj._rev, function callback(err, doc){
        if (!err) {
            console.log('Successfully updated');
            //update the Doc revision
            that._rev(doc.rev);
        } else {
            console.log("error");
            console.log(err);
            that.saveError(err);
        }
    });
}
 
// Basic Collection declaration
function Collection(options){
    var that = this;

    this.dbName = ko.observable(options.db || './db')
    this.remoteCouch = ko.observable(options.remoteCouch || null);

    // Database connection
    this.db = new PouchDB(this.dbName());
 
    this.mapping = {
        'doc': {
            create: function(options) {
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
                return new Document({db: that.db, data: options.data});
            }
        }
    };
 
    this.allRows = ko.observableArray();
    this.toJson = ko.computed(this.toJson, this);
    this.CurrentDocument = ko.observable(null);
    this.syncState = ko.observable("starting...");

    // filtering
    this.showDeleted = ko.observable(false);

    this.rows = ko.computed(function() {
        if(that.showDeleted()) {
            return that.allRows(); 
        } else {
            return ko.utils.arrayFilter(that.allRows(), function(row) {
                return row.doc.pdb_deleted() != true;
            });
        }
    });
 
};

Collection.prototype.sync = function() {
    that = this;
    if (this.remoteCouch()){
        this.syncState('syncing');
        var opts = {live: true};
        this.db.sync(this.remoteCouch(), opts)
            .on('change', function (info) {
                // handle change
                //console.log("change");
            }).on('complete', function (info) {
                // handle complete
                console.log("complete");
                console.log(info);
                that.syncState('complete');
            }).on('uptodate', function (info) {
                // handle up-to-date
                console.log("uptodate");
                console.log(info);
                that.syncState('uptodate');
            }).on('error', function (err) {
                // handle error
                console.log("err");
                console.log(err);
                that.syncState('error');
            });
    } else {
        console.log("no remote Couch defined");
    }
}

// Collection methods
Collection.prototype.new = function() {
    var doc = {
        data: {
            _id: new Date().toISOString(),
            _rev: "",
            Label: "new doc",
            Content: ""
        },
        db: this.db
    }
    console.log(doc);
    var newDoc = new Document(doc);
    this.allRows.push({doc: newDoc});
    newDoc.update();
}
 
// method to get all the documents
Collection.prototype.getAll = function() {
    that = this;
              
    this.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        if (!err) {
            // map the returned rows to the observable array
            //console.log(doc.rows);
            ko.mapping.fromJS(doc.rows, that.mapping, that.allRows);
        } else {
            console.log("error");
            console.log(err);
        }
    });
}
 
// Computed methods
// method to help debug
Collection.prototype.toJson = function() {      
    return JSON.stringify(ko.mapping.toJS(this.allRows), null, 2); 
}
 