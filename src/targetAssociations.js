var apijs = require("tnt.api");
var tnt_node = require("tnt.tree.node");
var _ = require("lodash");
var bubblesView = require("cttv.bubblesView");
var flowerView = require("cttv.flowerView");
var cttvApi = require("cttv.api");
var bubbles_tooltips = require("./tooltips.js");
var menu = require("./menu.js");

var targetAssociations = function () {
    var tooltips = bubbles_tooltips();

    // Default flowerView
    var defaultFlower = flowerView()
        .diagonal(160)
        .fontsize(10);

    // config attrs are exposed as getset in the api
    var config = {
        target : "",
    	diameter : 1000,
    	// cttvApi : cttvApi(),
        data : undefined, // if passed, should be a promise
        bubblesView: bubblesView(),
        flowerView: defaultFlower,
        colors: ["#CBDCEA", "#005299"],
        linkPrefix: "https://www.targetvalidation.org",
        tooltips: tooltips,
    };

    var currTA;

    var node_color = d3.scale.linear();

    function render (div) {
        var data = config.data;

        // node color
        node_color
            .domain([0,1])
            .range(config.colors);

        // Set up the bubbles view correctly
        config.bubblesView
            .root(config.root)
            .value("association_score")
            .key("__disease_id")
            .label("__disease_name")
            .stripeInternalNodes(true)
            .index(function (d) {
                return d.__key;
            })
            .showBreadcrumbs(true)
            .breadcrumbsClick(function (d) {
                var node = d.link;
                config.bubblesView.focus(node);
                    // node.property("__focused", false);
                    var children = node.children(true);
                    if (children) {
                        for (var i=0; i<children.length; i++) {
                            children[i].apply(function (child) {
                                if(!child.is_collapsed() && !config.bubblesView.root().property("_fullyOpened")) {
                                    child.toggle();
                                    child.property("__focused", false);
                                }
                            }, true);
                        }
                    }
                config.bubblesView.update();
            })
            .diameter(config.diameter)
            .color(function (node) {
                if (node.children()) {
                    return "#EFF3FF";
                }
                return node_color(node.property("association_score"));
            })
            .labelColor(function (node) {
                if (node.property("association_score") < 0.5) {
                    return "black";
                }
                return "white";
            });

        // var tree = config.bubblesView.root();
        // config.bubblesView.root(tree);
        // Tooltips
        config.bubblesView
            // .on("click", tooltips.click)
            .on("mouseover", config.tooltips.mouseover)
            .on("mouseout", config.tooltips.mouseout);
        	// Render
        function manageFocus (node) {
            if (node.property("__focused")) {
                node.property("__focused", false);
                // focus on the parent
                var children = node.children(true);
                if (children) {
                    for (var i=0; i<children.length; i++) {
                        var child = children[i];
                        if(!child.is_collapsed() && (!config.bubblesView.root().property("_fullyOpened"))) {
                            child.toggle();
                            child.property("__focused", false);
                        }
                    }
                }
                config.bubblesView.focus(node.parent());
            } else {
                node.property("__focused", true);
                config.bubblesView.focus(node);
            }
            config.bubblesView.update();
        }
        config.bubblesView.on("click", function (node) {
            // We are in a leave. Just show the tooltip
            if (!node.children(true)) {
                config.tooltips.click.call(this, node);
                return;
            }
            if (config.bubblesView.root().property("_fullyOpened")) {
                manageFocus(node);
            } else
            if (node.parent() && node.children(true)) {
                if (node.data().depth===1) {
                    console.log("SETTING CURRENT TA TO " + node.property("__disease_name"));
                    currTA = node;
                }
                node.toggle();
                manageFocus(node);
                // if (node.property("__focused")) {
                //     node.property("__focused", false);
                //     // focus on the parent
                //     var children = node.children(true);
                //     if (children) {
                //         for (var i=0; i<children.length; i++) {
                //             var child = children[i];
                //             if(!child.is_collapsed()) {
                //                 child.toggle();
                //                 child.property("__focused", false);
                //             }
                //         }
                //     }
                //     config.bubblesView.focus(node.parent());
                // } else {
                //     node.property("__focused", true);
                //     config.bubblesView.focus(node);
                // }
                // config.bubblesView.update();
            }
            // else {
            //     tooltips.click.call(this, node);
            // }
        });

    	config.bubblesView(div.node());
    }

    var ga = function (div) {

        tooltips
            .flowerView(config.flowerView)
            .target(config.target)
            .prefix(config.linkPrefix);

        var vis = d3.select(div)
            .append("div")
            .style("position", "relative");

        if (config.data === undefined) { // config.data should be a promise
            var api = cttvApi()
                .prefix("http://test.targetvalidation.org:8008/api/latest/");
            var url = api.url.associations({
                target: config.target,
                datastructure: "tree",
                expandefo: false,
                facets: false
            });
            ga.data(api.call(url));
        } else {  // We already have a promise to use
            config.data
                .then (function (resp) {
                    var data = resp.body.data;
                    setData(data);
                    // processData(data);
                    // config.data = data;

                    // menu
                    menu(div, config.bubblesView, ga, currTA);
                    render(vis);
                });

            // menu
            // menu(div, config.bubblesView, ga, currTA);
            // render(vis);
        }
    };

    var api = apijs(ga)
        .getset(config);

    // process data
    // flattening the tree (duplicates?)
    function processData (data) {
        if (!data) {
            return [];
        }

        if (!data.children) {
            return data;
        }

        var therapeuticAreas = data.children;
        for (var i=0; i<therapeuticAreas.length; i++) {
            var tA = therapeuticAreas[i];
            var taChildren = tA.children;
            if (!taChildren) {
                // If the TA doesn't have children just create one for it with the same information as the TA
                tA.children = [_.clone(tA)];
            }
            tA.__disease_id = tA.disease.id;
            tA.__disease_name = tA.disease.name;

            // adjust name and toggle the tree structure and save it under the "childrenTree" property
            var ta_node = tnt_node(tA);
            ta_node.apply(function (node) {
                var d = node.data();
                d.__disease_id = d.disease.id;
                d.__disease_name = d.disease.name;
                var key = "";
                node.upstream(function (node) {
                    key = key + "_" + node.property(function (d) {return d.disease.id;});
                });
                d.__key = key;
            }, true);
            tA.childrenTree = _.cloneDeep(tA.children); // can be done with ta_node.subtree?

            // Create the flatten structure of the children
            var flattenChildren = ta_node.flatten(true).data().children;
            var newChildren = [];
            var nonRedundant = {};
            for (var j=0; j<flattenChildren.length; j++) {
                var childData = flattenChildren[j];
                if (nonRedundant[childData.name] === undefined) {
                    nonRedundant[childData.name] = 1;
                    newChildren.push(childData);
                }
            }
            tA.children = newChildren;
        }
        return data;
    }

    // function sortData (data) {
    //     var dataSorted = _.sortBy(data.children, function (d) {
    //         return d.children ? -d.children.length : 0;
    //     });
    //
    //     for (var i=0; i<data.children.length; i++) {
    //         data.children[i].children = _.sortBy (data.children[i].children, function (d) {
    //             return -d.association_score;
    //         });
    //     }
    //     data.children = dataSorted;
    //     return data;
    // }

    // api.getset('data');
    // api.transform('data', function (d) {
    //     config.root = tnt_node(d);
    //     return processData(d);
    // });
    // Getters / Setters
    function setData (d) {
        if (!arguments.length) {
            return config.data;
        }
        //processData(d);
        config.data = processData(d);
        console.log(config.data);
        //config.data = d;
        config.root = tnt_node(config.data);
        var children = config.root.children();
        for (var i=0; i<children.length; i++) {
            var child = children[i];
            child.toggle();
            var granChildrenTrees = child.data().childrenTree; // array of nodes
            for (var k=0; k<granChildrenTrees.length; k++) {
                var granChildrenTree = tnt_node(granChildrenTrees[k]);
                granChildrenTree.apply(function (n) {
                    n.toggle();
                }, true);
            }
        }
        config.bubblesView.root(config.root);
        return this;
    }

    // ga.target = function (t) {
    //     if (!arguments.length) {
    //         return config.target;
    //     }
    //     config.target = t;
    //     return this;
    // };

    ga.diameter = function (d) {
        if (!arguments.length) {
            return config.diameter;
        }
        config.diameter = d;
        // Hot plug
        if (config.bubblesView) {
            config.bubblesView.diameter(d);
        }
        return this;
    };

    // ga.cttvApi = function (api) {
    //     if (!arguments.length) {
    //         return config.cttvApi;
    //     }
    //     config.cttvApi = api;
    //     return this;
    // };

    // api.getset('filters');
    // api.transform('filters', function (dts) {
    //     tooltips.filters(dts);
    //     return;
    // });
    // ga.filters = function (dts) {
    //     if (!arguments.length) {
    //         return tooltips.filters();
    //     }
    //     tooltips.filters(dts);
    //     return this;
    // };
    ga.filters = tooltips.filters;

    // api.getset('names');
    // api.transform('names', function (dts) {
    //     tooltips.names(dts);
    //     return;
    // });
    // ga.names = function (dts) {
    //     if (!arguments.length) {
    //         return tooltips.names();
    //     }
    //     tooltips.names(dts);
    //     return this;
    // };
    ga.names = tooltips.names;

    // Other methods to interact with the bubblesView
    // api.method('update', function (data) {
    //     ga.data (data);
    //     config.bubblesView
    //         .data(config.root);
    //     config.bubblesView.update();
    // });
    ga.update = function (u) {
        if ((u.constructor.name !== 'Request') && (u.then === undefined)) {
            setData(u);
            config.bubblesView
                .root(config.root);
            config.bubblesView.update();
        } else {
            // assume promise
            u
                .then (function (resp) {
                    console.log(resp);
                    var data = resp.body.data;
                    // recurse
                    ga.update(data);
                });
        }
    };

    api.method('selectTherapeuticArea', function (efo) {
        //ga.selectTherapeuticArea = function (efo) {
        var taNode = config.root.find_node (function (node) {
            return node.property("name") == efo;
        });
        if (!taNode) {
            taNode = config.root;
        }
        if (taNode.property("focused") === true) {
            taNode.property("focused", undefined);
            config.bubblesView.focus(config.root);
        } else {
            taNode.property("focused", true);
            // release prev focused node
            config.bubblesView.focus().property("focused", undefined);
            // focus the new node
            config.bubblesView.focus(taNode);
        }
        config.bubblesView.select(config.root);
        return this;
        //    };
    });

    api.method('selectDisease', function (efo) {
        // ga.selectDisease = function (efo) {
        // This code is for diseases with multiple parents
        // var nodes = nodeData.find_all(function (node) {
        //  return node.property("efo_code") === efo;
        // });
        // var lca;
        // if (nodes.length > 1) {
        //  lca = tree.lca(nodes);
        // } else {
        //  lca = nodes[0].parent();
        // }
        var dNode = config.root.find_node (function (node) {
            if (node.parent() === undefined) {
                return false;
            }
            return efo.efo === node.property(function (n) { return n.disease.id; }) && efo.parent_efo === node.parent().property(function (n) { return n.disease.id; });
        });
        if (dNode.property("selected") === true) {
            dNode.property("selected", undefined);
            config.bubblesView.select(config.root);
        } else {
            dNode.property("selected", true);
            config.bubblesView.select([dNode]);
        }
        return this;
        // };
    });

    return ga;
};

module.exports = targetAssociations;
