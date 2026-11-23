# 97 — Show and review photos selected outside current results

Status: resolved

Show the hidden/not-shown selection count in the floating bar. Provide a responsive review dialog listing selected photos, their visible/hidden and in-use status, with per-photo removal and a clear-hidden action. Keep final permanent deletion behind the existing confirmation and server protection. Review/removal must not issue delete requests.

## Answer

The floating selection bar counts selected photos outside currently loaded results. Review selection opens a searchable dialog with shown/not-shown and protected status, individual removal, a hidden-only view and removal of hidden selections. Rows paginate locally in groups of 100 without requesting extra thumbnail bytes. Final deletion explicitly warns about not-shown selections and retains the existing confirmation and server protection.

Desktop/mobile journeys select six photos, narrow to one result, remove a hidden selection and clear the remaining hidden selections, asserting that none of these actions sends DELETE. Existing bulk-deletion tests pass for protected photos and partial-failure retry. Counts reflect loaded results, including pagination, rather than claiming a photo is excluded solely by filters.
