// extend the base document
Document.prototype.Content = "";
Document.prototype.Label = "";

var markgiu = markgiu || {};

markgiu.converter = new Showdown.converter({ extensions: ['github', 'wikilink', 'table'] });

markgiu.AppGui = function(){

    var that = this;

    this.model = new Collection({});
    //populate local copy of DB
    this.model.getAll();

    this.toJson = ko.observable(this.model.toJson);

    this.newDoc = function(){
        that.model.new();  
    }

    this.updateDoc = function(){
        console.log("updateDoc called");
        console.log(that.model.CurrentDocument());
        that.model.put(that.model.CurrentDocument());
    };   

    this.selectDoc = function(){
        //console.log(this);
        that.model.CurrentDocumentID(this._id);
    }

    this.convertedContent = ko.computed(function(){
        if (that.model.CurrentDocument()){ 
            var content = that.model.CurrentDocument().Content();

            if (content){
                var cnt = markgiu.converter.makeHtml(content);
                //var p = self.filepath();
                //var bp = self.getBasePath(p);
                //cnt = cnt.replace('img src="', 'img src="'+bp);
                return cnt;
            }
        }
        return null;     
    }, this);

    this.deleteDoc = function(){

    }

};
