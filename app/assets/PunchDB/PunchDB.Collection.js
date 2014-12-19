_log.info("Loading PunchDB Collection");
 
var PunchDB = PunchDB || {};
 
// Basic Collection declaration
function Collection(options){
    var that = this;
 
    this.dbName = ko.observable(options.db() || './db');
    this.remoteCouch = ko.observable(options.remoteCouch() || null);
    this.password = ko.observable(options.password() || "");
    this.continousSync = ko.observable(options.continousSync() || false);
    this.encrypt = ko.observable(options.encrypt() || false);  
 
    // Database connection
    this.db = new PouchDB(this.dbName());
    this.changeVariable = this.MonitorChanges();
    this.syncVariable;
    this.mapping = {
        'doc': {
            create: function(options) {
                return new Document({db: that.db, data: options.data, Collection: that});
            }
        }
    };
   
    // Data
    this.allRows = ko.observableArray();
    this.CurrentDocument = ko.observable(null);
 
    // Process Variables
    if (this.continousSync) {
        this.syncState = ko.observable("starting...");
        this.syncDB();
    } else {
        this.syncState = ko.observable("local mode");
    }

    // extras (maybe not part of PunchDB but rather the applicaiton [TODO])
    this.showDeleted = ko.observable(false);
 
    // Computed Observables
    this.toJson = ko.computed(this.toJson, this);
 
    this.rows = ko.computed(this.rows, this);
};
 
// Collection methods
Collection.prototype.new = function(data) {
    var doc = {
        data: data,
        db: this.db,
        Collection: this
    }
    _log.debug("new document: ", doc);
    var newDoc = new Document(doc);
    this.allRows.push({doc: newDoc});
    newDoc.update();
}

Collection.prototype.addDocToArray = function(obj) {
    var doc = {
        data: obj.doc,
        db: this.db,
        Collection: this
    }
    _log.debug("adding document to the array: ", doc);
    var newDoc = new Document(doc);
    this.allRows.push({doc: newDoc});
} 

Collection.prototype.getDocFromArrayByID = function(observableArray, id){
    that = this;
 
    var doc = ko.utils.arrayFirst(observableArray(), function(item) {
            //_log.info(item);
            return item.doc._id() === id;
        }) || null;

    return doc;
}
// method to get all the documents
Collection.prototype.getAll = function() {
    that = this;
             
    this.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        if (!err) {
            // map the returned rows to the observable array
            //_log.info(doc.rows);
            ko.mapping.fromJS(doc.rows, that.mapping, that.allRows);
        } else {
            _log.error(err);
        }
    });
}
 
Collection.prototype.onDocumentUpdate = function(obj) {
    _log.info("Collection.prototype.onDocumentUpdate");
 
    var doc = this.getDocFromArrayByID(this.allRows, obj.doc._id);

    if (doc == null){ // no local copy
        // add the doc to the array
        _log.info("Adding the doc to the array");
        this.addDocToArray(obj);
    } else if (!(doc.doc.dirtyFlag.isDirty()) && (obj.doc._rev > doc.doc._rev())) { // local is clean and remote is newer
        // replace the document from the DB...
        _log.info("Replacing the array document with the one from the DB");
        this.allRows.remove(doc);
        this.addDocToArray(obj);
    } else if (doc.doc.dirtyFlag.isDirty() && (obj.doc._rev > doc.doc._rev())) { // local is dirty and remote is newer
        // conflict resolution needed...
        _log.info(" - - conflict resolution needed...")
    } else if (!(doc.doc.dirtyFlag.isDirty()) && (obj.doc._rev < doc.doc._rev())) { // local is clean and remote is older
        // need to save the local version and\or sync with the remote DB
        _log.info(" - - need to save the local version and\or sync with the remote DB");
    } else {    // catch all
        // do nothing
        _log.info("Document is up to date");
    }
}
 
Collection.prototype.onDocumentCreate = function() {_log.info("Collection.prototype.onDocumentCreate");}
Collection.prototype.onDocumentDelete = function() {_log.info("Collection.prototype.onDocumentDelete");} 
Collection.prototype.onDocumentError = function() {_log.info("Collection.prototype.onDocumentError"); }
 
Collection.prototype.MonitorChanges = function() {
    that = this;
 
    var changes = this.db.changes({
        live: true,
        include_docs: true
    });

    changes.on('update', function(obj){
        _log.info("Collection.prototype.MonitorChanges - Update");
        console.log(obj);
        if (that instanceof Document){
            that.Collection.onDocumentUpdate(obj);
        } else if (that instanceof Collection){
            that.onDocumentUpdate(obj);
        } 
    } );
    changes.on('create', function(obj){ 
        _log.info("Collection.prototype.MonitorChanges - Create"); 
        _log.debug(obj); 

        if (that instanceof Document){
            that.Collection.onDocumentUpdate(obj);
        } else if (that instanceof Collection){
            that.onDocumentUpdate(obj);
        } 
    } );
    changes.on('delete', function(obj){ _log.info("Collection.prototype.MonitorChanges - Delete"); _log.debug(obj) } );
    changes.on('error' , function(obj){ _log.info("Collection.prototype.MonitorChanges - Error"); _log.debug(obj)  } );
 
    return changes;
}
 
Collection.prototype.syncDB = function() {
    that = this;
    if (this.remoteCouch()){
        this.syncState('syncing');
        var opts = {
            live: true,
            include_docs: true
        };
        this.syncVariable = this.db.sync(this.remoteCouch(), opts);

        this.syncVariable.on('change', function (info) {
                // handle change
                _log.info("Collection.prototype.syncDB - Change");
                _log.debug(info);
            });
        this.syncVariable.on('complete', function (info) {
                // handle complete
                _log.info("Collection.prototype.syncDB - Complete");
                _log.debug(info);
                that.syncState('Complete');
            });
        this.syncVariable.on('uptodate', function (info) {
                // handle up-to-date
                _log.info("Collection.prototype.syncDB - Up to date");
                _log.debug(info);
                that.syncState('Up To Date');
            });
        this.syncVariable.on('error', function (err) {
                // handle error
                _log.error("Collection.prototype.syncDB - Error");
                _log.error(err);
                that.syncState('Error - Sync Cancelled');
                that.syncVariable.cancell();
            });
    } else {
        _log.error("no remote Couch defined");
    }
}
 
// Computed methods
// method to help debug
Collection.prototype.toJson = function() {     
    return JSON.stringify(ko.mapping.toJS(this.allRows), null, 2);
}
 
Collection.prototype.rows = function() {
    if(this.showDeleted()) {
        return that.allRows();
    } else {
        return ko.utils.arrayFilter(this.allRows(), function(row) {
            return row.doc.pdb_deleted() != true;
        });
    }
}
 