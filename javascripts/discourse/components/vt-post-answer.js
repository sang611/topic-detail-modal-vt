import Component from "@ember/component";
import { popupAjaxError } from "discourse/lib/ajax-error";
export default Component.extend({
    init() {
        this.set("showEdit", false);
        this._super(...arguments);
        const isValidAction = this.answer.is_edit_or_detroyed && !this.answer.user_deleted;
        this.set("isValidAction", isValidAction);
        const isUpdated = this.answer.version != 1;
        this.set("isUpdated", isUpdated);

        this.set("rating_average", Math.round(this.answer.rating_average))
    },
    actions: {
        onHide() {
            this.set("showEdit", false);
        },
        onEditAnswer(event) {
            event.preventDefault();
            this.set("showEdit", true);
        },
        onDeleteAnswer(event) {
            event.preventDefault();
            event.stopPropagation();
            const composer = this.store.createRecord("composer");
            composer.vt_deletedPost(this.answer).then(resp => {
                composer.vt_refresh();
            }).catch(error => {
                popupAjaxError(error);
            })
        }
    }
});
