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
import { ajax } from "discourse/lib/ajax";

const START_DRAG_EVENTS = ["touchstart", "mousedown"];
const DRAG_EVENTS = ["touchmove", "mousemove"];
const END_DRAG_EVENTS = ["touchend", "mouseup"];

const THROTTLE_RATE = 20;
import { renderAvatar } from "discourse/helpers/user-avatar";

function mouseYPos(e) {
  return e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
}

export default Component.extend(KeyEnterEscape, {
  init() {
    this._super(...arguments);
    this.set('comment', null);
  },

  keyDown(e) {
    if (e.key === "Enter") {
      this.send("createComment", e);
      return false;
    }
  },
  actions: {
    save(e) {
      const composer = this.store.createRecord("composer");
      const promise = composer
        .vt_save(
          {
            imageSizes: {},
            editReason: null,
            raw: $(".vt-comments-form-input").val(),
            category: this.topic.category_id,
            topic_id: this.topic.id
          })
        .then((result) => {
          $(".vt-comments-form-input").val("")
        })
        .catch((error) => {
        });
    },
    createComment(e) {

      return ajax("/qa/comments", {
        type: "POST",
        data: { raw: $(".vt-comments-form-input").val(), post_id: this.post.id },
      })
        .then((response) => {
          $(".vt-comments-form-input").val("")
          let avatar = renderAvatar(this.user, {
            imageSize: "large",
            siteSettings: this.siteSettings,
          })

          let html = `<div class="vt-comments-list">
      <div class="vt-users">
        ${avatar}
        <span>${this.user.name}</span>
      </div>
      <div class="vt-comments-item">
        ${response.raw}
      </div>
    </div>`
    $(".vt-comments-list-container").append(html)
        })
        .catch(popupAjaxError)
        .finally(() => {

        });
    }
  }
})
