import Component from "@ember/component";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Component.extend({
    inputAnswer: "",
    isProcess: false,
    isUploading: false,
    isProcessingUpload: false,
    model: null,
    init() {
        this._super(...arguments);
        this.set("model", { reply: this.answer.raw || "" });
        this.set("inputAnswer", this.answer.raw || "");
        this.set("isProcess", false);
    },
    showUploadSelector() {
        document.getElementById("file-uploader").click();
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
                raw: $(".d-editor-input").val(),
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
});
