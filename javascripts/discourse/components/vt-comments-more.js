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
import { renderAvatar } from "discourse/helpers/user-avatar";

const START_DRAG_EVENTS = ["touchstart", "mousedown"];
const DRAG_EVENTS = ["touchmove", "mousemove"];
const END_DRAG_EVENTS = ["touchend", "mouseup"];

const THROTTLE_RATE = 20;

function mouseYPos(e) {
  return e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
}

export default Component.extend(KeyEnterEscape, {
  init() {
    this._super(...arguments);
  },

  actions: {
    showmore(e) {
      $(".vt-comments-more ").hide()
      let last_comment_id = $(".vt-comments-list-container .vt-comments-list.load-init").last().data("id")
      ajax("/qa/comments/", {
        dataType: "json",
        type: "GET",
        data: { post_id: this.post.id, last_comment_id: last_comment_id }
      }).then((response) => {
        let comments = response.comments;
        let last_element = $(".vt-comments-list-container .vt-comments-list.load-init").first()
        for (let i = 0; i < comments.length; i++) {
          let avatar = renderAvatar(comments[i].user_info, {
            imageSize: "large",
            siteSettings: this.siteSettings,
          })
          let name = comments[i].user.name || comments[i].username

          let html = `<div class="vt-comments-list load-init" data-id="${comments[i].id}" >
        <div class="vt-users">
          ${avatar}
          <span>${name}</span>
        </div>
        <div class="vt-comments-item">
          ${comments[i].raw}
        </div>
      </div>`
          $(html).insertAfter($($(".vt-comments-list-container .vt-comments-list").last()))
        }
      }).catch(
        (error) => popupAjaxError(error)
      );
    }
  }
})
