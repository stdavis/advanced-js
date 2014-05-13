var map;
var parcels;
define([
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!app/templates/App.html",

    "esri/map", 
    "esri/layers/FeatureLayer",
    "esri/layers/ArcGISTiledMapServiceLayer", 
    "esri/tasks/query",
    "esri/symbols/SimpleFillSymbol", 
    "esri/symbols/SimpleLineSymbol",
    "esri/graphic", 
    "esri/dijit/Popup", 
    "esri/dijit/PopupTemplate",
    "esri/urlUtils", 
    "esri/graphicsUtils",
    "esri/Color",

    "dojo/_base/declare",
    "dojo/on", 
    "dojo/query", 
    "dojo/parser", 
    "dojo/dom-construct",

    "dijit/layout/BorderContainer", 
    "dijit/layout/ContentPane", 
    "dojo/domReady!"
], function(
    _WidgetBase,
    _TemplatedMixin,
    template,

    Map, 
    FeatureLayer,
    ArcGISTiledMapServiceLayer, 
    Query,
    SimpleFillSymbol, 
    SimpleLineSymbol,
    Graphic, 
    Popup, 
    PopupTemplate,
    urlUtils, 
    graphicsUtils,
    Color,

    declare,
    on, 
    query, 
    parser, 
    domConstruct
) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        
        postCreate: function () {
            console.log('app/App:postCreate', arguments);
            
            //apply a selection symbol that determines the symbology for selected features 
            var sfs = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([111, 0, 255]),
                    2
                ),
                new Color([111, 0, 255, 0.15])
            );

            var popup = new Popup({
                fillSymbol: sfs
            }, domConstruct.create("div"));

            map = new Map("map", {
                infoWindow: popup,
                slider: false
            });
            var basemap = new ArcGISTiledMapServiceLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/TaxParcel/AssessorsBasemap/MapServer/");
            map.addLayer(basemap);

            //apply a popup template to the parcels layer to format popup info 
            var popupTemplate = new PopupTemplate({
                title: "{PARCELID}",
                fieldInfos: [{
                    fieldName: "SITEADDRESS",
                    label: "Address:",
                    visible: true
                }, {
                    fieldName: "OWNERNME1",
                    label: "Owner:",
                    visible: true
                }]
            });

            //add the parcels layer to the map as a feature layer in selection mode we'll use this layer to query and display the selected parcels
            parcels = new FeatureLayer("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/TaxParcel/AssessorsBasemap/MapServer/1", {
                outFields: ["*"],
                infoTemplate: popupTemplate,
                mode: FeatureLayer.MODE_SELECTION
            });

            parcels.setSelectionSymbol(sfs);

            //when users click on the map select the parcel using the map point and update the url parameter
            var that = this;
            map.on("click", function(e) {
                var query = new Query();
                query.geometry = e.mapPoint;
                var deferred = parcels.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(selection) {
                    //update the url param if a parcel was located
                    if (selection.length > 0) {
                        var parcelid = selection[0].attributes["PARCELID"];
                        //Refresh the URL with the currently selected parcel
                        if (typeof history.pushState !== "undefined") {
                            window.history.pushState(null, null, "?parcelid=" + selection[0].attributes.PARCELID);
                        }
                    }
                });
                deferred.then(function (selection) {
                    that.txtBox.value = selection[0].attributes.USEDSCRP;
                });
                map.infoWindow.setFeatures([deferred]);
                map.infoWindow.show(e.mapPoint);
            });

            map.on("layers-add-result", function(result) {
                // Add a link into the InfoWindow Actions panel       
                var emailLink = domConstruct.create("a", {
                    "class": "action",
                    "innerHTML": "Email Map",
                    "href": "javascript:void(0);"
                }, query(".actionList", map.infoWindow.domNode)[0]);

                // Register a function to be called when the user clicks on
                // the above link
                on(emailLink, "click", function(evt) {
                    var feature = map.infoWindow.getSelectedFeature();
                    var url = window.location;
                    var emailLink = "mailto:?subject=Parcel Map of :" +
                        feature.attributes.PARCELID + "&body=Check out this map: %0D%0A " +
                        window.location;
                    window.location.href = emailLink;
                });

                //When users navigate through the history using the browser back/forward buttons select appropriate parcel  
                //https://developer.mozilla.org/en/DOM/Manipulating_the_browser_history
                window.onpopstate = function(event) {
                    var parcelid = getParcelFromUrl(document.location.href);
                    if (parcelid) {
                        selectParcel(parcelid);
                    } else {
                        parcels.clearSelection();
                        map.infoWindow.hide();
                    }
                };

                //if a parcelid is specified in url param select that feature 
                var parcelid = getParcelFromUrl(document.location.href);
                selectParcel(parcelid);
            });

            map.addLayers([parcels]);

            //extract the parcel id from the url
            function getParcelFromUrl(url) {
                var urlObject = urlUtils.urlToObject(url);
                if (urlObject.query && urlObject.query.parcelid) {
                    return urlObject.query.parcelid;
                } else {
                    return null;
                }
            }

            //select parcel from the feature layer by creating a query to look for the input parcel id 
            function selectParcel(parcelid) {
                if (parcelid) {
                    var query = new Query();
                    query.where = "PARCELID = '" + parcelid + "'";
                    var deferred = parcels.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(selection) {
                        var center = graphicsUtils.graphicsExtent(selection).getCenter();
                        map.centerAt(center).then(function() {
                            //zoom to the center then display the popup 
                            map.infoWindow.setFeatures(selection);
                            map.infoWindow.show(center);
                        });
                    });
                }
            }
        }
    });
});