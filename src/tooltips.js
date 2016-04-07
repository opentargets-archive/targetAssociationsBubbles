var apijs = require("tnt.api");
var tnt_tooltip = require("tnt.tooltip");
var deferCancel = require ("tnt.utils").defer_cancel;
var cttvConsts = require("cttv.consts");


var tooltips = function () {

    var config = {
        "filters":{},
        "names": cttvConsts,
        "flowerView": undefined,
        "target": undefined,
        "prefix": ""
    };

    var t = {};
    var hover_tooltip;

    var show_deferred = deferCancel(function (obj, ev) {
        hover_tooltip.call(this, obj, ev);
    }, 200);
    var hide_deferred = deferCancel(function () {
        if (hover_tooltip) {
            hover_tooltip.close();
        }
    }, 200);

    t.mouseover = function (node) {
        if (node.parent() === undefined) {
            return;
        }
        var ev = d3.event;
        hover_tooltip = tnt_tooltip.plain()
            .id(2)
            .width(180)
            .show_closer(false);

        var obj = {};
        obj.header = "";
        // obj.rows = [];
        // obj.rows.push({
        //     "value": node.property(function (n) { return n.disease.name; })
        // });
        // obj.rows.push({
        //     "value": "Association Score: " + node.property("association_score").toFixed(2)
        // });
        // if (node.is_collapsed()) {
        //     obj.rows.push({
        //         "value": "Collapsed diseases: " + node.n_hidden()
        //     });
        // }
        // obj.header = node.property('label') + " (" + node.property("association_score") + ")";
        // obj.body = "<b>" + node.property(function (n) { return n.disease.efo_info.label; }) + "</b>" + "<br />" + "Association score: " + node.property("__association_score").toFixed(2) + "<br />" + (node.is_collapsed() ? ("Collapsed diseases: " + node.n_hidden()) + "<br />Click to uncollapse": (!node.children() ? "Click to display info": "Click to collapse"));
        var children = node.children();
        obj.body = "<b>" + node.property(function (n) { return n.disease.efo_info.label; }) + "</b>" + "<br />" + "Association score: " + node.property("__association_score").toFixed(2) + (children && children.length ? ("<br />" + children.length + " diseases") : "") + "<br />" + "Click to see details";


        show_deferred.call(this, obj, ev);
    };

    t.mouseout = function (node) {
        hide_deferred();
    };

    t.click = function (node) {
        // toplevel root is not shown in the bubbles view
        if (node.parent() === undefined) {
            return;
        }

        var obj = {};
        var score = node.property("__association_score");
        obj.header = node.property(function (n) { return n.disease.efo_info.label; }) + " (Association Score: " + score.toFixed(2) + ")";
        obj.rows = [];

        var diseaseProfileLoc = config.prefix + "/disease/" + node.property(function (n) { return n.disease.id; });
        var diseaseAssocLoc = diseaseProfileLoc + "/associations";
        obj.rows.push({
            "value": '<a href="' + diseaseProfileLoc + '"><span class="fa-stack"><i class="fa fa-circle fa-stack-2x"></i><i class="fa fa-align-justify fa-stack-1x fa-inverse"></i></span> Profile</a> | <a href="' + diseaseAssocLoc + '">Associations <span class="fa-stack"><i class="fa fa-circle fa-stack-2x"></i><i class="fa fa-th fa-stack-1x fa-inverse"></i></span></a>'
        });

        var evidenceLoc = config.prefix + "/evidence/" + config.target + "/" + node.property(function (n) { return n.disease.id; }) + (config.filters.score_str ? "?score_str=" + config.filters.score_str[0] : "");
        obj.rows.push({
            "value" : "<a class='cttv_flowerLink' href=" + evidenceLoc + "><div class='tnt_flowerView'></div>View evidence details</a>",
        });
        //obj.rows.push({
        //    "value" : "<a href=" + evidenceLoc + "><span>View evidence details</span></a>"
        //});


        //obj.body="<a class='cttv_flowerLink' href=" + loc + "><div class='tnt_flowerView'></div></a><a href=" + loc + ">View evidence details</a>";

        var leafTooltip = tnt_tooltip.list()
            .id(1)
            .width(180);

        //Hijack of the fill callback
        var tableFill = leafTooltip.fill();

        //Pass a new fill callback that calls the original one and decorates with flowers
        leafTooltip.fill(function (data) {
            tableFill.call(this, data);
            var nodeDatatypes = node.property(function (d) {
                return d.association_score.datatypes;
            });

            //var datatypes = {};
            var flowerData = [];
            for (var i=0; i<config.names.datatypesOrder.length; i++) {
                var dkey = config.names.datatypes[config.names.datatypesOrder[i]];
                var key = config.names.datatypesOrder[i];
                var datasource = nodeDatatypes[dkey];

                //datatypes[dkey] = lookDatasource(nodeDatatypes, dkey);
                // var datasource = lookDatasource(nodeDatatypes, dkey);
                flowerData.push({
                    "value": datasource,
                    "label": config.names.datatypesLabels[key],
                    "active": true, //hasActiveDatatype(names.datatypes[key])
                });

            }


            config.flowerView
                .values (flowerData);
            config.flowerView(d3.select(this).select("div .tnt_flowerView").node());
            //flowerView.values(flowerData)(this.select("div").node());
        });

        leafTooltip.call(this, obj);

        // This code is duplicated several times now (controllers, directives and components)
        // function lookDatasource (arr, dsName) {
        //     for (var i=0; i<arr.length; i++) {
        //         var ds = arr[i];
        //         if (ds.datatype === dsName) {
        //         return {
        //             "count": ds.__evidence_count,
        //             "score": ds.__association_score
        //         };
        //         }
        //     }
        //     return {
        //         "count": 0,
        //         "score": 0
        //     };
        // }

        // function hasActiveDatatype (checkDatatype) {
        //     for (var datatype in datatypes) {
        //         if (datatype === checkDatatype) {
        //             return true;
        //         }
        //     }
        //     return false;
        // }


    };

    // API
    apijs(t)
        .getset(config);

    // t.flowerView = function (view) {
    //     if (!arguments.length) {
    //         return flowerView;
    //     }
    //     flowerView = view;
    //     return this;
    // };
    //
    // t.target = function (t) {
    //     if (!arguments.length) {
    //         return target;
    //     }
    //     target = t;
    //     return this;
    // };
    //
    // t.filters = function (dts) {
    //     if (!arguments.length) {
    //         return filters;
    //     }
    //     filters = dts;
    //     return this;
    // };
    //
    // t.names = function (allDts) {
    //     if (!arguments.length) {
    //         return names;
    //     }
    //     names = allDts;
    //     return this;
    // };

    // t.dtsLabels = function (lbs) {
    //     if (!arguments.length) {
    //         return labels;
    //     }
    //     labels = lbs;
    //     return this;
    // };

    return t;

};

module.exports = exports = tooltips;
