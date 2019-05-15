require("./config/config");

var https = require("https");

var xml2js = require("xml2js");
var xml2jsParse = xml2js.parseString;

var express = require("express");
var app = express();

var cors = require("cors");
var trustedDomains = process.env.trustedDomains;

var allowedOption = {
  origin: function(origin, callback) {
    if (origin === undefined || trustedDomains.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Unknow trusted domain"));
    }
  }
};

app.use(cors(allowedOption));

// search book title
app.get("/search", (req, res, next) => {
  var query = req.query || {};
  var q = query.q || "";
  var page = query.p || 1;
  var params =
    "search=title&q=" +
    encodeURIComponent(query.q) +
    "&page=" +
    page +
    "&key=" +
    process.env.dkey;
  https.get("https://www.goodreads.com/search/index.xml?" + params, resp => {
    let data = "";
    resp.on("data", chunk => {
      data += chunk;
    });

    resp.on("end", () => {
      xml2jsParse(data, (err, result) => {
        res.json(formatSearchResp(result));
      });
    });
  });
});

function formatSearchResp(result) {
  var finalResp = {};
  if (result) {
    if (result.hasOwnProperty("GoodreadsResponse")) {
      var GoodreadsResp = result.GoodreadsResponse || {};
      if (GoodreadsResp.hasOwnProperty("search")) {
        var searchResp = GoodreadsResp.search
          ? GoodreadsResp.search[0] || {}
          : {};
        if (searchResp && searchResp.hasOwnProperty("results")) {
          var resultsResp = searchResp.results || [];
          if (resultsResp.length > 0) {
            var resultsObj = resultsResp[0] || {};
            var workArr = resultsObj.work || [];
            var wlen = workArr.length || 0;
            var wkeys = {
              books_count: "bc",
              ratings_count: "rc",
              original_publication_year: "opy",
              average_rating: "ar",
              best_book: ""
            };
            var bkeys = {
              id: "id",
              title: "bn",
              image_url: "iu",
              small_image_url: "siu",
              author: "an"
            };

            var fresultArr = [];
            for (let i = 0; i < wlen; i++) {
              var robj = {};
              var workobj = workArr[i];

              for (var wkey in wkeys) {
                if (workobj.hasOwnProperty(wkey)) {
                  var wkdata = workobj[wkey][0];
                  if (wkey === "best_book") {
                    for (var bkey in bkeys) {
                      var bkdata = wkdata[bkey][0];
                      if (bkey === "author") {
                        robj[bkeys[bkey]] = bkdata.name[0] || "";
                      } else {
                        if ("string" === typeof bkdata) {
                          robj[bkeys[bkey]] = bkdata || "";
                        } else {
                          robj[bkeys[bkey]] = bkdata["_"] || "";
                        }
                      }
                    }
                  } else {
                    if ("string" === typeof wkdata) {
                      robj[wkeys[wkey]] = workobj[wkey][0] || "";
                    } else {
                      robj[wkeys[wkey]] = workobj[wkey][0]["_"] || "";
                    }
                  }
                }
              }

              fresultArr.push(robj);
              finalResp.results = fresultArr;
            }
          }
        }

        if (searchResp) {
          var fresultObj = {};
          var skeys = {
            "results-start": "rs",
            "results-end": "re",
            "total-results": "tr",
            "query-time-seconds": "qts"
          };

          for (var skey in skeys) {
            if (searchResp.hasOwnProperty(skey)) {
              fresultObj[skeys[skey]] = searchResp[skey][0] || "";
            }
          }
          finalResp.meta = fresultObj;
        }
      }
    }
  }
  return finalResp;
}

// Listen server port
app.listen(process.env.port, () => {
  console.log("Server running on port " + process.env.port);
});
