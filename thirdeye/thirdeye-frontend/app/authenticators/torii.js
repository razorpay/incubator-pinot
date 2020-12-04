import Ember from "ember";
import Torii from "ember-simple-auth/authenticators/torii";
const { service } = Ember.inject;

export default Torii.extend({
  torii: service("torii"),
  restore: function (data) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      if (!Ember.isEmpty(data)) {
        resolve(data);
      } else {
        reject();
      }
    });
  },

  authenticate(options) {
    return this._super(options).then(function (data) {
      const url = "/auth/authenticate";
      const credentials = {
        principal: "torii google auth",
        code: data.authorizationCode,
      };

      const postProps = {
        method: "post",
        body: JSON.stringify(credentials),
        headers: {
          "content-type": "Application/Json",
        },
      };
      return fetch(url, postProps)
        .then((response) => {})
        .catch(() => {});
    });
  },

  async invalidate() {
    const url = "/auth/logout";
    await fetch(url);
    return this._super();
  },
});
