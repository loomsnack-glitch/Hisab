# Google Contacts Synchronization is asynchronous

Customer creation and updates—including those made in billing—commit in Ganatri without waiting for Google Contacts. Eligible changes schedule a background synchronization attempt that retries transient failures and exposes authorization or conflict failures in Google Contacts Sync Status, so an external integration can never interrupt the core customer workflow.
