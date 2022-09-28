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
    let votes = new Array(5);
    this.set('comment', null);

    for (let i = 0; i < this.answer.self_rating_answer; i++) {
      votes[i] = "active"
    }
    this.set('votes', votes);

  },

  actions: {
    voting(e) {
      let answer_by = this.answer.answer_by;
      if(!answer_by || answer_by === "") {
        return;
      }
      if(User.current().id == answer_by) {
        alert("Bạn không thể tự vote cho câu trả lời của mình.");
        return;
      }

      let answer_id = this.answer.id;
      if(!answer_id || answer_id === "") {
        return;
      }

      return ajax("/qa/vote", {
        type: "POST",
        data: { direction: e, post_id: answer_id },
      }).then((response) => {
        if (response.success == "OK") {
          alert(`Bạn đã đánh giá ${e} sao.`);
          const composer = this.store.createRecord("composer");
          composer.vt_refresh();
        }
      })
      .catch(popupAjaxError)
      .finally(() => {

      });
    },
  }
})
