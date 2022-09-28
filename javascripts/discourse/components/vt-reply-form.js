import { cancel, later, schedule, throttle } from "@ember/runloop";
import discourseComputed, {
  bind,
  observes,
} from "discourse-common/utils/decorators";
import Component from "@ember/component";
import Composer from "discourse/models/composer";
import KeyEnterEscape from "discourse/mixins/key-enter-escape";
import afterTransition from "discourse/lib/after-transition";
import discourseDebounce from "discourse-common/lib/debounce";
import { headerOffset } from "discourse/lib/offset-calculator";
import positioningWorkaround from "discourse/lib/safari-hacks";
import { popupAjaxError } from "discourse/lib/ajax-error";
import showModal from "discourse/lib/show-modal";

const START_DRAG_EVENTS = ["touchstart", "mousedown"];
const DRAG_EVENTS = ["touchmove", "mousemove"];
const END_DRAG_EVENTS = ["touchend", "mouseup"];

const THROTTLE_RATE = 20;

function mouseYPos(e) {
  return e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
}

export default Component.extend(KeyEnterEscape, {
  isProcess: false,
  init() {
    this._super(...arguments);
    this.set('comment', null);
    this.set('isProcess', false);
  },

  actions: {
    required(e) {

    },
    save(params, event) {
      event.stopPropagation();
      this.set('isProcess', true);
      const composer = this.store.createRecord("composer");
      composer
        .vt_save(
          {
            imageSizes: {},
            editReason: null,
            raw: $(".vt-reply-form-input").val(),
            category: this.topic.category_id,
            topic_id: this.topic.id
          }).then((result) => {
            if (result.responseJson.post) {
              this.set('topic', {
                ...this.topic,
                answer_user: result.responseJson.post.display_username,
                answer_content: result.responseJson.post.raw
              });
              composer.vt_refresh();
            } else {
              showModal("answer-enqueues", {
                model: result.responseJson,
                title: "review.approval.answer_title"
              });
            }
        })
        .catch((error) => {
          if (error?.jqXHR?.responseJSON) {
            const { errors } = error.jqXHR.responseJSON;
            if (errors?.length) {
              alert(errors[0]);
            }
          } else {
            popupAjaxError(error);
            // alert("Bạn chưa có quyền trả lời bài viết này.");
          }
        }).finally(() => {
          // const timerId = setTimeout(() => {
            this.set("isProcess", false);
            // clearTimeout(timerId)
        // }, 300);
        });
    }
  }
})
