const Document = require("@Utility/document");
const Constants = require("@Utility/constants");
const MongoDB = require("@Utility/mongodb");
const GeneralResponse = require("@Utility/general_response");
const Utility = require("@Utility/index");

module.exports = {
  "POST /:id": {
    middlewares: [],
    async handler(req, res) {
      const { id } = req.params;
      const { label, url } = req.body;

      if (!label || !url || !id) {
        throw Error(
          "Bad Request : required parameters is empty(id, label, url)"
        );
      }

      console.log(label, url);

      const idWithoutHyphens = id.replace(/-/g, "");

      const thirdPartyCol = await MongoDB.getCollection(
        Document.collections.THIRD_PARTY
      );
      const userActionCol = await MongoDB.getCollection(
        Document.collections.USER_ACTION
      );

      const getUserAction = await userActionCol.findOne({
        user: idWithoutHyphens,
        "action.label": label,
        "action.url": url,
        "action.latest": {
          $gte: Date.now() - 60 * 5 * 1000,
        },
      });

      if (!!getUserAction) {
        return new GeneralResponse({
          statusCode: 200,
          message: "already update userAction(5minute ago)",
          data: {},
        });
      }

      const newUserAction = {
        user: idWithoutHyphens,
        action: {
          label: label,
          url: url,
          latest: Date.now(),
        },
      };

      await userActionCol.insertOne(newUserAction);

      const update = await Promise.all(
        await thirdPartyCol.findOneAndUpdate(
          {
            label: label,
            "url.main": url,
          },
          {
            $inc: {
              "userAction.click": 1,
            },
          },
          { returnDocument: "after" }
        )
      );

      return new GeneralResponse({
        statusCode: 200,
        message: "userAction update Complete",
        data: update,
      });
    },
  },
};
