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
import User from "discourse/models/user";

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
    save(e) {
      if(User.current().id == this.post.user_id) {
        alert("Bạn không thể tự like cho bài viết của mình.");
        return;
      }

      if ($(".topic-views-hear").hasClass("liked"))
        return ajax(`/post_actions/${this.post.id}`, {
          type: "DELETE",
          data: {
            post_action_type_id: 2,
          },
        }).then((response) => {
          $(".topic-views-hear").removeClass("liked")
          let number = parseInt($(".topic-views-hear .like-count .number").html())
          $(".topic-views-hear .like-count .number").html(number - 1)
        })
          .catch(popupAjaxError)
          .finally(() => {
          });
      else {
        return ajax("/post_actions", {
          type: "POST",
          data: {
            id: this.post.id,
            post_action_type_id: 2,
            flag_topic: false
          },
        }).then((response) => {
          $(".topic-views-hear").removeClass("liked").addClass("liked")
          let number = parseInt($(".topic-views-hear .like-count .number").html())
          $(".topic-views-hear .like-count .number").html(number + 1)
        })
          .catch(popupAjaxError)
          .finally(() => {
          });
      }
    }
  }
})
