console.log("Loading PunchDB.js");
// Class declarations
// Basic Unit
 
function Document(options) {
    ko.mapping.fromJS(options.data, {}, this);
 

    this.db = options.db;   
    this.saveError = ko.observable(null);

    if(!('deleted' in this)) {
        this.deleted = ko.observable(false);
    }
    if(!('deleted_timestamp' in this)) {
        this.deleted_timestamp = ko.observable();
    }

}

Document.prototype.delete = function(){
    that = this;

    console.log(this);
    console.log(ko.mapping.toJS(this));

    this.deleted(true);
    this.deleted_timestamp(new Date().toISOString())

    this.update();

    console.log(this);
    console.log(ko.mapping.toJS(this));

}
 
Document.prototype.update = function(){
    that = this;
 
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

    // Database connection
    this.db = new PouchDB(options.db || './db');
 
    this.mapping = {
        'doc': {
            create: function(options) {
                // check for required properties
                if(!('deleted' in options.data)){
                    options.data.deleted = false;
                }
                if(!('deleted_timestamp' in options.data)){
                    options.data.deleted_timestamp = "";
                }
                return new Document({db: that.db, data: options.data});
            }
        }
    };
 
    this.allRows = ko.observableArray();
    this.toJson = ko.computed(this.toJson, this);
    this.CurrentDocument = ko.observable(null);

    // filtering
    this.showDeleted = ko.observable(false);

    this.rows = ko.computed(function() {
        if(that.showDeleted()) {
            return that.allRows(); 
        } else {
            return ko.utils.arrayFilter(that.allRows(), function(row) {
                return row.doc.deleted() != true;
            });
        }
    });
 
};

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
 