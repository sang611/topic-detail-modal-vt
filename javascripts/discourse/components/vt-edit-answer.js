import Component from "@ember/component";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Component.extend({
    inputAnswer: "",
    isProcess: false,
    init() {
        this._super(...arguments);
        this.set("inputAnswer", this.answer.raw || "");
        this.set("isProcess", false);
    },
    actions: {
        cancelEdit() {
            this.onHide();
        },
        onUpdate(params, event) {
            event.stopPropagation();
            this.set("isProcess", true);
            const composer = this.store.createRecord("composer");
            composer.vt_updatedPost({
                id: this.answer.id,
                editReason: "updated_by -> khainq",
                raw: $(".vt-edit-answer-input").val(),
                rawOld: this.answer.raw,
                categoryId: this.topic.category_id,
                topicId: this.topic.id
            }).then(() => {
                composer.vt_refresh();
            })
            .catch(error => {
                popupAjaxError(error)
            })
            .finally(() => {
                const timerId = setTimeout(() => {
                    this.set("isProcess", false);
                    clearTimeout(timerId)
                }, 300);
            })
        }
    }
});
