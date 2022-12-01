import Component from "@ember/component";
import KeyEnterEscape from "discourse/mixins/key-enter-escape";
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
  inputAnswer: "",
  isProcess: false,
  isUploading: false,
  isProcessingUpload: false,
  model: null,
  init() {
    this._super(...arguments);
    this.set("model", { reply: "" });
    this.set('comment', null);
    this.set('isProcess', false);
  },
  showUploadSelector() {
    document.getElementById("file-uploader").click();
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
            raw: $(".d-editor-input").val(),
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
    },

    // start 
    storeToolbarState(toolbarEvent) {
      this.set("toolbarEvent", toolbarEvent);
    },
    onPopupMenuAction(menuAction) {
        this.send(menuAction);
    },
    afterRefresh($preview) {
        const topic = this.get("topic");
        const linkLookup = this.linkLookup;

        if (!topic || !linkLookup) {
          return;
        }

        // Don't check if there's only one post
        if (topic.posts_count === 1) {
          return;
        }

        const post = this.get("answer");
        const $links = $("a[href]", $preview);
        $links.each((idx, l) => {
          const href = l.href;
          if (href && href.length) {
            // skip links added by watched words
            if (l.dataset.word !== undefined) {
              return true;
            }

            // skip links in quotes and oneboxes
            for (let element = l; element; element = element.parentElement) {
              if (
                element.tagName === "DIV" &&
                element.classList.contains("d-editor-preview")
              ) {
                break;
              }

              if (
                element.tagName === "ASIDE" &&
                element.classList.contains("quote")
              ) {
                return true;
              }

              if (
                element.tagName === "ASIDE" &&
                element.classList.contains("onebox") &&
                href !== element.dataset["onebox-src"]
              ) {
                return true;
              }
            }

            const [linkWarn, linkInfo] = linkLookup.check(post, href);

            if (linkWarn && !this.get("isWhispering")) {
              const body = I18n.t("composer.duplicate_link", {
                domain: linkInfo.domain,
                username: linkInfo.username,
                post_url: topic.urlForPostNumber(linkInfo.post_number),
                ago: shortDate(linkInfo.posted_at),
              });
              this.appEvents.trigger("composer-messages:create", {
                extraClass: "custom-body",
                templateName: "custom-body",
                body,
              });
              return false;
            }
          }
          return true;
        });
    },
  }
})
