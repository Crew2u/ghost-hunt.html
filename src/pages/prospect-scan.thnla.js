import wixLocation from 'wix-location';
import wixData from 'wix-data';

$w.onReady(async function () {

    // Always start disabled until validated
    $w('#submitButton').disable();
    $w('#errorText').hide();
    $w('#rockTypeText').hide();
    $w('#rockImage').hide();
    $w('#rockTypeInput').value = ''; // hidden input to store rock type

    // Get rock ID from QR
    const rockIdFromQR = (wixLocation.query.rock || '').trim();

    if (rockIdFromQR) {
        $w('#rockIdInput').value = rockIdFromQR;

        // Determine rock type from first character
        let rockType = '';
        let rockImageUrl = '';

        const prefix = rockIdFromQR.charAt(0).toUpperCase();
        switch (prefix) {
            case 'G':
                rockType = 'Gold';
                rockImageUrl = 'https://static.wixstatic.com/media/9442ff_2cf1de09b4cc4bee9d8794b8f48b1f7e~mv2.png';
                break;
            case 'S':
                rockType = 'Silver';
                rockImageUrl = 'https://static.wixstatic.com/media/9442ff_85d882b7f2014ca686d453c8ee960a78~mv2.png';
                break;
            case 'C':
                rockType = 'Cobalt';
                rockImageUrl = 'https://static.wixstatic.com/media/9442ff_fcca6836b3114064a52889fd2517879b~mv2.png';
                break;
            case 'M':
                rockType = 'Mystery';
                rockImageUrl = 'https://static.wixstatic.com/media/9442ff_b63d972b0fb54a6c9698a8eedba52bca~mv2.png';
                break;
            default:
                rockType = 'Unknown';
                rockImageUrl = '';
        }

        // Store rock type in hidden input for submit handler
        $w('#rockTypeInput').value = rockType;

        if (rockType !== 'Unknown') {
            $w('#rockTypeText').text = rockType;
            $w('#rockTypeText').show();

            if (rockImageUrl) {
                $w('#rockImage').src = rockImageUrl;

                // Flash animation
                $w('#rockImage')
                    .show('fade', { duration: 200 })
                    .then(() => $w('#rockImage').hide('fade', { duration: 200 }))
                    .then(() => $w('#rockImage').show('fade', { duration: 200 }));

                // Keep visible after flash
                $w('#rockImage').show();
            }
        }

        try {
            // Check for duplicate immediately
            const existing = await wixData.query("ProspectFinds")
                .eq("rockId", rockIdFromQR)
                .find();

            if (existing.totalCount > 0) {
                $w('#errorText').text =
                    "⚠ This metal node has already been secured and cannot be reused.";
                $w('#errorText').show();
                return; // stop here
            }

            // Rock is valid
            $w('#submitButton').enable();

        } catch (err) {
            console.error("SAVE ERROR:", err);
            $w('#errorText').text = err.message || "Unknown save error";
            $w('#errorText').show();
        }
    }

    // Submit logic
    $w('#submitButton').onClick(async () => {

        const name = ($w('#nameInput').value || '').trim();
        const email = ($w('#emailInput').value || '').trim();
        const rockId = ($w('#rockIdInput').value || '').trim();
        const rockType = ($w('#rockTypeInput').value || '').trim(); // read from hidden input

        if (!name || !email || !rockId || !rockType) {
            $w('#errorText').text = "Please complete all fields.";
            $w('#errorText').show();
            return;
        }

        try {
            // Save to ProspectFinds with rockType automatically
            await wixData.insert("ProspectFinds", {
                name,
                email,
                rockId,
                colour: rockType,  // auto-set from QR
                scanDate: new Date()
            });

            // Update ProspectUsers totals
            const userResults = await wixData.query("ProspectUsers")
                .eq("email", email)
                .find();

            if (userResults.totalCount > 0) {
                let user = userResults.items[0];
                user.totalFinds = (user.totalFinds || 0) + 1;
                user.goldCount = (user.goldCount || 0) + (rockType === "Gold" ? 1 : 0);
                user.silverCount = (user.silverCount || 0) + (rockType === "Silver" ? 1 : 0);
                await wixData.update("ProspectUsers", user);
            } else {
                await wixData.insert("ProspectUsers", {
                    name,
                    email,
                    totalFinds: 1,
                    goldCount: rockType === "Gold" ? 1 : 0,
                    silverCount: rockType === "Silver" ? 1 : 0,
                    rank: "Recruit"
                });
            }

            $w('#submitButton').label = "Logged ✔";
            $w('#submitButton').disable();
            $w('#errorText').hide();

        } catch (err) {
            console.error("Save failed:", err);
            $w('#errorText').text = "Error saving scan. Please try again.";
            $w('#errorText').show();
        }
    });
});
