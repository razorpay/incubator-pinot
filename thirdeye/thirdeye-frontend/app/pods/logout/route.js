import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

/**
 * Logout Page
 * This is necessary because we need to have access to this from
 * the old (non-Ember) UI
 */
export default Route.extend(AuthenticatedRouteMixin, {
  session: service(),

  beforeModel() {
    this._super(...arguments);
    this.get("session").invalidate();
  },

  async model(params) {
    const headers = {};
    let sessionToken = this.get("session.data.authenticated.session");
    if (sessionToken && !isEmpty(sessionToken)) {
      console.get("in headers");
      headers["Authorization"] = "Token " + sessionToken;
    }

    return hash({
      headers,
    });
  },
});
